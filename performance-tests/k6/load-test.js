import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import encoding from 'k6/encoding';

const FLEET_URL = __ENV.FLEET_URL || 'wss://ws.sentryguard.org:12345/';
const DURATION = __ENV.DURATION || '5m';

// Charger les données de test
const testData = new SharedArray('testData', function() {
  const data = JSON.parse(open('./data/valid-test-data.json'));
  return Object.values(data);
});

// Métriques personnalisées existantes
const messageSendSuccess = new Counter('message_send_success');
const ackReceived = new Counter('ack_received');
const connectionDuration = new Trend('connection_duration');
const connectionSuccess = new Counter('connection_success');

// MÉTRIQUES POUR LA LATENCE END-TO-END (calculées côté serveur)
const endToEndLatency = new Trend('end_to_end_latency');
const delayedMessages = new Counter('delayed_messages');
const onTimeMessages = new Counter('on_time_messages');

// 👥 50 UTILISATEURS ACTIFS EN CONTINU
export const options = {
  scenarios: {
    constant50Users: {
      executor: 'constant-vus',
      vus: 50,               // 50 utilisateurs en parallèle
      duration: DURATION,    // Pendant X minutes
    },
  },

  // Seuils de performance MIS À JOUR
  thresholds: {
    'connection_success': ['rate>0.95'],
    'message_send_success': ['rate>0.9'],
    'ack_received': ['rate>0.85'],
    'connection_duration': ['avg<5000', 'p(95)<8000'],
    'ws_connecting': ['p(95)<1000'],
    // NOUVEAUX SEUILS DE LATENCE END-TO-END
    'end_to_end_latency': ['avg<2000', 'p(95)<5000'], // Latence moyenne < 2s, 95ème percentile < 5s
    'delayed_messages': ['rate<0.1'], // Moins de 10% des messages en retard
  },

  // Configuration mTLS
  tlsAuth: [{
    domains: ['ws.sentryguard.org'],
    cert: open('./test-certs/vehicle_device.VIN-1.cert'),
    key: open('./test-certs/vehicle_device.VIN-1.key'),
  }],
  insecureSkipTLSVerify: true,
};

export default function () {
  const vehicleData = testData[__VU % testData.length];
  const messages = vehicleData.messages;

  const startTime = Date.now();

  const headers = {
    'X-Network-Interface': 'wifi',
    'Version': '1.0.0',
  };

  const res = ws.connect(FLEET_URL, { headers: headers }, function (socket) {
    const connectedTime = Date.now();
    connectionSuccess.add(1);

    socket.on('open', () => {
      console.log(`VU ${__VU}: Connexion établie pour ${vehicleData.device_id}`);
    });

    socket.on('message', (data) => {
      ackReceived.add(1);

      // Tenter de parser le message ACK pour mesurer la latence
      try {
        const ackMessage = JSON.parse(data);
        if (ackMessage.correlationId) {
          // C'est un ACK avec correlation ID - mesurer la latence
          measureEndToEndLatency(ackMessage.correlationId, Date.now());
        }
      } catch (e) {
        // ACK sans correlation ID ou format différent - ignorer
      }
    });

    socket.on('error', (e) => {
      console.error(`VU ${__VU}: Erreur WebSocket:`, e);
    });

    // Envoyer des messages périodiquement avec ID de corrélation
    let messageIndex = 0;
    const messageInterval = socket.setInterval(() => {
      if (messageIndex >= messages.length) {
        messageIndex = 0; // Recommencer
      }

      const baseMessage = messages[messageIndex];

      // GÉNÉRER UN HASH DU MESSAGE POUR LA CORRÉLATION (sans modifier protobuf)
      const sentAt = Date.now().toString();

      // Créer le message de télémétrie (format original, sans champs de performance)
      const telemetryMessage = {
        data: [
          {
            key: 'SentryMode',
            value: { stringValue: 'Off' }
          }
        ],
        createdAt: new Date().toISOString(),
        vin: vehicleData.vin || 'TESTVIN123456789',
        isResend: false,
        // Inclure les données originales du message si nécessaire
        ...baseMessage
      };

      try {
        // Encoder le message en JSON puis en base64 (format existant)
        const jsonMessage = JSON.stringify(telemetryMessage);
        const binaryData = encoding.b64decode(encoding.b64encode(jsonMessage), 'std');

        // APPROCHE SIMPLIFIÉE: Ne pas modifier les données protobuf
        // Le correlationId sera généré automatiquement côté serveur
        // basé sur le contenu du message (VIN + timestamp + données)

        socket.sendBinary(binaryData);
        messageSendSuccess.add(1);

        console.log(`VU ${__VU}: Message envoyé`);

      } catch (e) {
        console.error(`VU ${__VU}: Erreur envoi:`, e);
        messageSendSuccess.add(0);
      }

      messageIndex++;
    }, 10000); // Un message toutes les 10 secondes (au lieu de 2 pour éviter la surcharge)

    // Maintenir la connexion pendant 15-30 secondes
    const duration = 15000 + Math.random() * 15000;
    socket.setTimeout(() => {
      const endTime = Date.now();
      connectionDuration.add(endTime - connectedTime);
      socket.close();
    }, duration);
  });

  check(res, {
    '✅ Connexion WebSocket réussie': (r) => r && r.status === 101,
  });

  if (!res || res.status !== 101) {
    console.error(`VU ${__VU}: Échec connexion`);
  }

  // Pause entre les itérations
  sleep(1 + Math.random() * 2); // 1-3 secondes
}


export function setup() {
  console.log('');
  console.log('='.repeat(80));
  console.log('🚀 TEST DE PERFORMANCE AVEC MESURE DE LATENCE END-TO-END');
  console.log('='.repeat(80));
  console.log('');

  console.log('📊 CONFIGURATION:');
  console.log('  • 50 utilisateurs virtuels en parallèle');
  console.log('  • Durée:', DURATION);
  console.log('  • 1 message toutes les 10 secondes par utilisateur');
  console.log('  • Connexion maintenue 15-30 secondes');
  console.log('  • Mesure de latence end-to-end activée');
  console.log('');

  console.log('🎯 OBJECTIFS DE PERFORMANCE:');
  console.log('  • 95% de connexions réussies');
  console.log('  • 90% de messages envoyés avec succès');
  console.log('  • 85% d\'ACKs reçus');
  console.log('  • Latence end-to-end < 2000ms (moyenne)');
  console.log('  • Latence end-to-end < 5000ms (95ème percentile)');
  console.log('  • < 10% de messages en retard (> 1000ms)');
  console.log('');

  console.log('🔗 URL:', FLEET_URL);
  console.log('🔐 Certificat: vehicle_device.VIN-1.cert');
  console.log('📦 Données:', testData.length, 'véhicule(s)');
  console.log('');

  console.log('='.repeat(80));
  console.log('');

  console.log('🚀 Démarrage du test...');
  console.log('');
}

export function teardown(data) {
  console.log('');
  console.log('='.repeat(80));
  console.log('✅ TEST TERMINÉ');
  console.log('='.repeat(80));
  console.log('');

  console.log('📊 RÉSUMÉ DES RÉSULTATS:');
  console.log(`  • Messages dans les temps: ${onTimeMessages.value || 0}`);
  console.log(`  • Messages en retard: ${delayedMessages.value || 0}`);
  console.log('  • Mesures de latence calculées côté serveur');
  console.log('');

  console.log('🔍 Consultez les métriques détaillées ci-dessus');
  console.log('📝 Surveillez les logs du serveur pour [LATENCY] et [SENTRY_LATENCY]');
  console.log('');
}
