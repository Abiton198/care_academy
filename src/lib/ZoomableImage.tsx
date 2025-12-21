"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
}

const ZoomableImage: React.FC<ZoomableImageProps> = ({ src, alt, className }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Thumbnail */}
      <motion.img
        src={src}
        alt={alt}
        className={className + " cursor-pointer"}
        whileHover={{ scale: 1.05 }}
        onClick={() => setIsOpen(true)}
      />

      {/* Fullscreen Lightbox */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)} // click anywhere to close
          >
            <motion.img
              src={src}
              alt={alt}
              className="max-h-[90%] max-w-[90%] object-contain cursor-zoom-out"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ZoomableImage;
