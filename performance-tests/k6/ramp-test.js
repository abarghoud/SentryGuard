import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import encoding from 'k6/encoding';

const FLEET_URL = __ENV.FLEET_URL || 'wss://ws.sentryguard.org:12345/';

// Charger les données de test
const testData = new SharedArray('testData', function() {
  const data = JSON.parse(open('./data/valid-test-data.json'));
  return Object.values(data);
});

// Métriques
const messageSendSuccess = new Counter('message_send_success');
const ackReceived = new Counter('ack_received');
const connectionDuration = new Trend('connection_duration');
const connectionSuccess = new Counter('connection_success');
const endToEndLatency = new Trend('end_to_end_latency');
const delayedMessages = new Counter('delayed_messages');
const onTimeMessages = new Counter('on_time_messages');

// TEST DE MONTÉE EN CHARGE PROGRESSIVE
export const options = {
  scenarios: {
    rampUpLoad: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 5 },   // Monter à 5 utilisateurs en 1 minute
        { duration: '2m', target: 20 },  // Monter à 20 utilisateurs en 2 minutes
        { duration: '2m', target: 50 },  // Monter à 50 utilisateurs en 2 minutes
        { duration: '3m', target: 100 }, // Monter à 100 utilisateurs en 3 minutes
        { duration: '2m', target: 100 }, // Maintenir 100 utilisateurs pendant 2 minutes
        { duration: '1m', target: 0 }    // Descendre à 0
      ],
    },
  },

  thresholds: {
    'connection_success': ['rate>0.95'],
    'message_send_success': ['rate>0.9'],
    'ack_received': ['rate>0.85'],
    'end_to_end_latency': ['avg<2000', 'p(95)<5000'],
    'delayed_messages': ['rate<0.1'],
    // Seuils plus stricts pendant la charge élevée
    'http_req_duration{stage:4}': ['p(95)<3000'], // Durant le stage 4 (100 users)
  },

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

  const headers = {
    'X-Network-Interface': 'wifi',
    'Version': '1.0.0',
  };

  const res = ws.connect(FLEET_URL, { headers: headers }, function (socket) {
    const connectedTime = Date.now();
    connectionSuccess.add(1);

    socket.on('open', () => {
      console.log(`VU ${__VU}: Connexion établie (${new Date().toISOString()})`);
    });

    socket.on('message', (data) => {
      ackReceived.add(1);

      // Mesurer la latence si c'est un ACK avec correlation ID
      try {
        const ackMessage = JSON.parse(data);
        if (ackMessage.correlationId) {
          measureEndToEndLatency(ackMessage.correlationId, Date.now());
        }
      } catch (e) {
        // ACK sans correlation ID - ignorer
      }
    });

    socket.on('error', (e) => {
      console.error(`VU ${__VU}: Erreur WebSocket:`, e);
    });

    // Envoyer des messages avec fréquence adaptative selon la charge
    let messageIndex = 0;
    const messageInterval = socket.setInterval(() => {
      if (messageIndex >= messages.length) {
        messageIndex = 0;
      }

      const sentAt = Date.now().toString();

      const telemetryMessage = {
        data: [{ key: 'SentryMode', value: { stringValue: 'Off' } }],
        createdAt: new Date().toISOString(),
        vin: vehicleData.vin || 'TESTVIN123456789',
        isResend: false,
        // correlationId et sentAt générés automatiquement côté serveur
      };

      try {
        const jsonMessage = JSON.stringify(telemetryMessage);
        const binaryData = encoding.b64decode(encoding.b64encode(jsonMessage), 'std');

        socket.sendBinary(binaryData);
        messageSendSuccess.add(1);

      } catch (e) {
        console.error(`VU ${__VU}: Erreur envoi:`, e);
        messageSendSuccess.add(0);
      }

      messageIndex++;
    }, 5000); // Un message toutes les 5 secondes

    // Durée de connexion plus courte pour permettre la montée en charge
    const duration = 10000 + Math.random() * 10000; // 10-20 secondes
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

  sleep(0.5 + Math.random() * 1); // 0.5-1.5 secondes
}


export function setup() {
  console.log('');
  console.log('='.repeat(80));
  console.log('📈 TEST DE MONTÉE EN CHARGE PROGRESSIVE');
  console.log('='.repeat(80));
  console.log('');

  console.log('📊 SCÉNARIO:');
  console.log('  • 1 → 5 utilisateurs (1 minute)');
  console.log('  • 5 → 20 utilisateurs (2 minutes)');
  console.log('  • 20 → 50 utilisateurs (2 minutes)');
  console.log('  • 50 → 100 utilisateurs (3 minutes)');
  console.log('  • 100 utilisateurs stables (2 minutes)');
  console.log('  • Descente à 0 (1 minute)');
  console.log('');

  console.log('🎯 OBJECTIFS:');
  console.log('  • Identifier le seuil de dégradation des performances');
  console.log('  • Mesurer l\'évolution de la latence end-to-end');
  console.log('  • Détecter les goulots d\'étranglement');
  console.log('');

  console.log('🔗 URL:', FLEET_URL);
  console.log('📦 Données:', testData.length, 'véhicule(s)');
  console.log('');

  console.log('='.repeat(80));
  console.log('');

  console.log('🚀 Démarrage du test de montée en charge...');
  console.log('');
}

export function teardown(data) {
  console.log('');
  console.log('='.repeat(80));
  console.log('✅ TEST DE MONTÉE EN CHARGE TERMINÉ');
  console.log('='.repeat(80));
  console.log('');

  console.log('📊 ANALYSE DES SEUILS:');
  console.log('  • Surveillez les métriques par stage pour identifier les seuils critiques');
  console.log('  • Comparez la latence end-to-end à chaque palier de charge');
  console.log('  • Identifiez à partir de combien d\'utilisateurs la dégradation apparaît');
  console.log('');
}
