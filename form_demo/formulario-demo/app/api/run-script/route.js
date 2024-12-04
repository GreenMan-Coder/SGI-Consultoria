import { exec } from "child_process";
import { NextResponse } from "next/server";
import path from "path";

export async function GET() {
  try {
    // Ruta del script en el sistema Windows desde WSL
    const wslPath = path.join(process.cwd(), "public", "updateExcel.ps1");
    const winPath = wslPath.replace("/mnt/", "").replace(/\//g, "\\").toUpperCase().replace(/^([a-zA-Z]):/, (_, drive) => `${drive}:\\`);

    // Ejecutar el script desde PowerShell
    const runScript = () =>
      new Promise((resolve, reject) => {
        exec(`powershell.exe -ExecutionPolicy Bypass -File "${winPath}"`, (error, stdout, stderr) => {
          if (error) {
            reject(stderr || error.message);
          } else {
            resolve(stdout || "Script ejecutado correctamente.");
          }
        });
      });

    const output = await runScript();
    return NextResponse.json({ message: output });
  } catch (error) {
    console.error("Error ejecutando el script:", error);
    return NextResponse.json(
      { error: "Ocurrió un error al ejecutar el script." },
      { status: 500 }
    );
  }
}
