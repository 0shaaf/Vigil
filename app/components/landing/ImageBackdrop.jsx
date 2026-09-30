import Image from 'next/image';

export default function ImageBackdrop() {
  return (
    <div className="scenic-image-wrapper" aria-hidden="true">
      <Image
        src="/bgIMG.jpeg"
        alt="Solitary Sentinel at Dusk Horizon"
        fill
        priority
        quality={95}
        sizes="100vw"
        style={{
          objectFit: 'cover',
          objectPosition: 'center right',
        }}
      />
    </div>
  );
}