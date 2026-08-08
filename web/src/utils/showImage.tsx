import { useState, useEffect } from 'react';
import { AvatarPhoto } from '../types';


export const ShowImage = ({ src = "", className = '', defaultAvatar = AvatarPhoto }) => {
  const [imageSrc, setImageSrc] = useState(src || defaultAvatar);

  useEffect(() => {
    setImageSrc(src || defaultAvatar);
  }, [src]);

  return (
    <img
      src={imageSrc}
      alt="Photo"
      className={`${className}`}
      onError={() => setImageSrc(defaultAvatar)}
    />
  );
};