import { useState } from "react";

const RunScriptButton = () => {
  const [status, setStatus] = useState("");

  const executeScript = async () => {
    setStatus("Ejecutando script...");
    try {
      const response = await fetch("/api/run-script");
      if (response.ok) {
        const result = await response.json();
        setStatus(result.message);
      } else {
        setStatus("Error al ejecutar el script.");
      }
    } catch (error) {
      console.error("Error:", error);
      setStatus("Error al ejecutar el script.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <button
        onClick={executeScript}
        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Ejecutar Script
      </button>
      {status && <p className="text-gray-700">{status}</p>}
    </div>
  );
};

export default RunScriptButton;
