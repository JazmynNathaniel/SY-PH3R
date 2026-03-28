import { motion } from "motion/react";

export function BinaryBackdrop() {
  const columns = [
    { left: "4%", delay: 0, text: "01010011\n01011001\n00101101\n01010000\n01001000\n00110011\n01010010\n00110001" },
    { left: "14%", delay: 1.4, text: "11001010\n10100101\n01010110\n00110101\n01001010\n10101001\n00110010" },
    { left: "24%", delay: 0.5, text: "00010101\n01010100\n11100010\n01010101\n00110010\n01000111\n00110011" },
    { left: "36%", delay: 1.1, text: "00110110\n01001110\n11110000\n01010111\n00101010\n01011101\n00110000" },
    { left: "62%", delay: 0.8, text: "01010111\n00110011\n01001001\n10101010\n00111100\n01010101\n01010001" },
    { left: "74%", delay: 1.6, text: "00110111\n01010110\n01001010\n11110010\n01010111\n00110100\n01001001" },
    { left: "86%", delay: 0.2, text: "01001010\n11100011\n01010110\n00110001\n01010011\n00111101\n01010100" }
  ];

  return (
    <div className="sy-backdrop">
      <motion.div
        className="sy-binary-layer pointer-events-none"
        animate={{ backgroundPositionY: ["0%", "100%"], opacity: [0.18, 0.3, 0.18] }}
        transition={{
          backgroundPositionY: { duration: 22, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
          opacity: { duration: 4.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
        }}
        style={{ backgroundSize: "100% 100%, 100% 180px" }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.03),transparent_42%)]"
        animate={{ opacity: [0.15, 0.32, 0.15] }}
        transition={{ duration: 5.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute inset-y-0 left-[14%] w-px bg-gradient-to-b from-transparent via-accent-primary/40 to-transparent"
        animate={{ opacity: [0.2, 0.7, 0.2] }}
        transition={{ duration: 3.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute inset-y-0 right-[18%] w-px bg-gradient-to-b from-transparent via-accent-secondary/40 to-transparent"
        animate={{ opacity: [0.16, 0.62, 0.16] }}
        transition={{ duration: 4.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      {columns.map((column) => (
        <motion.div
          key={column.left}
          className="sy-binary-column"
          style={{ left: column.left }}
          animate={{ y: ["-8%", "118%"], opacity: [0, 0.55, 0.24, 0] }}
          transition={{
            duration: 12,
            delay: column.delay,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear"
          }}
        >
          {column.text}
        </motion.div>
      ))}
      <div className="sy-noise" />
    </div>
  );
}
