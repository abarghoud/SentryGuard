import Image, { ImageProps } from 'next/image';

interface LocalizedImageProps extends Omit<ImageProps, 'src'> {
  baseSrc: string;
  locale: string;
}

export default function LocalizedImage({ 
  baseSrc, 
  locale, 
  alt, 
  ...props 
}: LocalizedImageProps) {
  const src = `${baseSrc}-${locale === 'fr' ? 'fr' : 'en'}.png`;
  return <Image src={src} alt={alt} {...props} />;
}
