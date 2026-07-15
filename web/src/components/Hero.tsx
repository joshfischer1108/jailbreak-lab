import { motion } from "framer-motion";
import { attacks } from "../data/techniques";
import "./hero.css";

export default function Hero() {
  return (
    <header className="hero">
      <div className="hero-grid" aria-hidden />
      <div className="section hero-inner">
        <motion.h1
          className="hero-title"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
        >
          Anatomy of an <span className="grad">LLM jailbreak</span>
        </motion.h1>

        <motion.p
          className="lede hero-lede"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
        >
          The model guards a secret it was told never to reveal. First try to smuggle that
          canary <span className="token">●</span> out yourself — then unlock {attacks.length} real
          jailbreak techniques and see exactly where the guardrail holds or breaks.
        </motion.p>

        <motion.div
          className="hero-meta mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <a href="#challenge">try to break it ↓</a>
        </motion.div>
      </div>
    </header>
  );
}
