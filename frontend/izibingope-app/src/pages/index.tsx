import { motion } from "framer-motion";
import { ExampleButton } from "../components/ExampleButton";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
      <motion.h1
        className="text-3xl font-bold mb-8 text-foreground"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        Bienvenido a Izibingope
      </motion.h1>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
      >
        <ExampleButton />
      </motion.div>
      <Link href="/bingo-sessions" className="mt-8">
        <Button variant="outline">Ir a Bingo Sessions</Button>
      </Link>
    </div>
  );
} 