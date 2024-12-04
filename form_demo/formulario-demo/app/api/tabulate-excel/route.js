import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';
import * as XLSX from 'xlsx';

export async function GET(req) {
  try {
    // Ruta absoluta al archivo Excel en la carpeta public
    const filePath = path.join(process.cwd(), 'public', 'FICHAS_PREDIAL_EIA_BUCARE_TABULADO.xlsx');

    // Verificar si el archivo existe en la ubicación
    if (!fs.existsSync(filePath)) {
      console.error(`Archivo no encontrado: ${filePath}`);
      return NextResponse.json({ error: 'El archivo no existe' }, { status: 404 });
    }

    // Leer el archivo Excel desde la ruta
    const fileBuffer = fs.readFileSync(filePath);

    // Procesar el archivo Excel
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    // Seleccionar la primera hoja del libro
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Realizar cambios en el archivo Excel
    worksheet['A1'] = { t: 's', v: 'Nueva celda' }; // Cambiar contenido de la celda A1
    worksheet['B2'] = { t: 'n', v: 123 }; // Cambiar contenido de la celda B2 (número)

    // Generar un buffer con el archivo actualizado
    const updatedExcelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Configurar la respuesta como descarga de archivo
    return new NextResponse(updatedExcelBuffer, {
      headers: {
        'Content-Disposition': 'attachment; filename=updated_template.xlsx',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error) {
    console.error('Error al procesar el archivo Excel:', error);
    return NextResponse.json({ error: 'Error al procesar el archivo Excel' }, { status: 500 });
  }
}
