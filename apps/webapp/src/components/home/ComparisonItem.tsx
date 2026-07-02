interface ComparisonItemProps {
  isPositive: boolean;
  title: string;
  description: string;
}

export default function ComparisonItem({ isPositive, title, description }: ComparisonItemProps) {
  return (
    <div className="flex gap-4">
      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
        <span className="text-xl">{isPositive ? '✅' : '❌'}</span>
      </div>
      <div>
        <h5 className="text-lg font-semibold mb-1">{title}</h5>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
