interface StepItemProps {
  icon: string;
  title: string;
  description: string;
}

export default function StepItem({ icon, title, description }: StepItemProps) {
  return (
    <div className="bg-white rounded-xl p-8 text-center relative hover:-translate-y-2 transition-transform duration-300">
      <div className="w-20 h-20 bg-white border-4 border-red-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md text-3xl">
        {icon}
      </div>
      <h4 className="text-xl font-semibold mb-3">{title}</h4>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
