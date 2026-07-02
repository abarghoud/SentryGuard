import type { LegalDocument } from '@/core/legal/legal-content';

interface LegalDocumentViewProps {
  document: LegalDocument;
  updatedLabel: string;
}

export function LegalDocumentView({ document, updatedLabel }: LegalDocumentViewProps) {
  return (
    <div className="container mx-auto px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-red-600 via-red-600 to-red-700 text-transparent bg-clip-text">
          {document.title}
        </h2>
        <p className="text-sm text-gray-500 mb-10">
          {updatedLabel}: {document.lastUpdated}
        </p>
        <p className="text-gray-700 mb-10 leading-relaxed">{document.intro}</p>

        <div className="space-y-8">
          {document.sections.map((section, sectionIndex) => (
            <section key={sectionIndex}>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{section.heading}</h3>
              <div className="space-y-3">
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <p key={paragraphIndex} className="text-gray-600 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
