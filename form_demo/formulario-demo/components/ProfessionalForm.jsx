"use client";

import { useEffect, useState } from "react";
import * as XLSX from 'xlsx';
import RunScriptButton from "./RunScriptButton";


export default function ProfessionalForm() {
  const [formData, setFormData] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [allForms, setAllForms] = useState([]);
  const questionsPerPage = 10; //Cantidad de páginas
  let globalIndex = 0;// Índice incremental para garantizar claves únicas

  const parseQuestions = (data, level = 0) => {
    let parsedQuestions = [];
    for (const [key, value] of Object.entries(data)) { //recorre cada clave del JSON
      let questionNumber = null;
      for (const subKey of Object.keys(value)) {
        const match = subKey.match(/Pregunta (\d+)/);
        if (match) {
          questionNumber = match[1]; // Almacena el número de la pregunta
          break; // Sale del bucle una vez que se encuentra el primer número
        }
      }
      if (typeof value === "object" && !Array.isArray(value)) { //Si es un objeto
        const cleanKey =key.includes("Pregunta_") ? key.replace("Pregunta_", ""): key; //Limpia los subtitulos
        const allRadioButtons = Object.values(value).every(//verifique si todos hijos son radiobutton
          (val) => typeof val === "string" && val.includes("_radiobutton")
        );
        if (allRadioButtons) {
          parsedQuestions.push({// Agrupar los radio buttons bajo la clave de la pregunta
            id: `${cleanKey}-${globalIndex++}`,
            ask: `question-${questionNumber}`,
            label: cleanKey,
            type: "radiobutton_group",
            options: Object.values(value).map((val) => val.replace("_radiobutton", ""))
          });
        } else {
          const radioButtons = []; 
          let questionNumber2 = null;
          for (const subKey of Object.keys(value)){
            console.log("value[subKey]: ",value[subKey]);
            if (typeof value[subKey] === "string" && value[subKey].includes("_radiobutton")) {
              radioButtons.push(subKey); // Guardar las claves de los radiobuttons
            }
          }
          if (radioButtons.length > 1){
            for (const key of radioButtons){
              console.log("Key: ",key);
              const match = key.match(/Pregunta (\d+)/); // Buscar el número después de "Pregunta"
              if (match) {
                console.log("match: ",match);
                questionNumber2 = match[1]; // Almacenar el número encontrado
                break;
              }
            }
          }
          if (questionNumber2){
            parsedQuestions.push({
              id: `${key}-${globalIndex++}`,
              ask: `question-${questionNumber2}`,
              label: cleanKey,
              type: "radiobutton_group",
              options: radioButtons.map((key) => value[key].replace("_radiobutton", ""))
            })
          }
          parsedQuestions.push({ type: "subtitle", text: cleanKey, id: `subtitle-${globalIndex++}` });
        }
        parsedQuestions = parsedQuestions.concat(parseQuestions(value, level + 1)); //Verifica niveles jerarquicos
        // }
      } else if (key.includes("Pregunta") && !value.includes("_radiobutton")) { //Logica para manejar preguntas abiertas
        parsedQuestions.push({
          id: `${key}-${globalIndex++}`, // Clave única para cada pregunta
          ask: `question-${questionNumber}`,
          label: value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(), //
          type: "text", //Tipo de input
          options: null,
        });
      }
    }

    return parsedQuestions;
  };

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch("/questions-pedrial-eia-bucare.json");
        const data = await response.json();
        const parsedQuestions = parseQuestions(data);
        setQuestions(parsedQuestions);
        setTotalPages(Math.ceil(parsedQuestions.length / questionsPerPage));
      } catch (error) {
        console.error("Error al cargar las preguntas:", error);
      }
    };

    fetchQuestions();
  }, []);

  const currentQuestions = questions.slice(
    currentPage * questionsPerPage,
    currentPage * questionsPerPage + questionsPerPage
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: `x_${value.toLowerCase()}` }));
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) setCurrentPage((prev) => prev + 1);
  };

  const handlePrevious = () => {
    if (currentPage > 0) setCurrentPage((prev) => prev - 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setAllForms((prev) => [...prev, { ...formData }]);
    setFormData({});
    setCurrentPage(0);
    console.log("Formulario enviado:", formData);
  };

  // Archivo JSON con formularios
  const exportToJson = () => {
    // Crear el objeto de datos a exportar a partir de allForms
    const dataToExport = {};
    allForms.forEach((form, index) => {
      dataToExport[`formulario#${index + 1}`] = form;
    });

    // Cargar el archivo 'responses-pedrial-eia-bucare.json' como base
    fetch('/responses-pedrial-eia-bucare.json')
      .then(response => response.json())
      .then(existingData => {
        const updatedData = { ...existingData };// Crear una copia del archivo existente para dejarlo sin cambios
        const findAndAssignValue = (obj, keyToFind, valueToAssign)=>{
          for (const key in obj){
            if (obj.hasOwnProperty(key)){
              if (key === keyToFind){
                obj[key]=valueToAssign;
                return true;
              }
              if (typeof obj[key]=== 'object' && !Array.isArray(obj[key])){
                // Si es un objeto, se llama recursivamente para buscar en el subobjeto
                if(findAndAssignValue(obj[key], keyToFind, valueToAssign)){
                  return true;
                }
              }
            }
          }
          return false; // Si no se encuentra la clave, se devuelve false
        }

        function iterateKeysRecursively(obj) {
          Object.keys(obj).forEach(key => {
            const questionNumber = key.match(/(\d+)/); // Extraer el número de la clave en dataToExport
            if (questionNumber && questionNumber[0] && !key.includes("formulario")) { 
              const matchingKey = `Respuesta ${questionNumber[0]}`;        
              const valueAssigned = findAndAssignValue(updatedData, matchingKey, obj[key]);
            } else {
              console.log(`Clave '${key}' no cumple con las condiciones.`);
            }
            // Si el valor es un objeto, llamar a la función recursivamente
            if (typeof obj[key] === "object" && obj[key] !== null) {
              iterateKeysRecursively(obj[key]);
            }
          });
        }
        // Iterar sobre cada formulario en el estado para comparar con el archivo existente
        iterateKeysRecursively(dataToExport)

        //SE DEBE IR AQUI PARA LA BASE DE DATOS

        
        
        //Exportar información tabulada
        const handleEditExcel = async () =>{
          try{
              const excelTabulate = await fetch("/FICHAS_PREDIAL EIA BUCARE_TABULADO.xlsx");
              const excelBlob = await excelTabulate.blob();
              const arrayBuffer = await excelBlob.arrayBuffer();
  
              const workbook = XLSX.read(arrayBuffer, { type: "array" });
  
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
  
              // Iterar sobre el JSON y actualizar celdas específicas
              // jsonData.forEach((item) => {
              //     const cellAddress = `${item.col}${item.num}`; // Crear dirección de celda, e.g., "A1"
              //     worksheet[cellAddress] = { t: "s", v: item.value }; // Escribir valor en la celda
              // });
  
              // Generar un nuevo archivo Excel
              const updatedExcel = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  
              // Crear un enlace para descargar el archivo
              const blob = new Blob([updatedExcel], { type: "application/octet-stream" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "updated_template.xlsx";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
  
              alert("El archivo Excel ha sido actualizado y descargado.");
          }catch (error) {
              console.error("Error al editar el archivo Excel:", error);
              alert("Hubo un error al procesar el archivo Excel.");
          }
        }
        handleEditExcel()

        //Crear un blob para la exportación de la copia actualizada
        const blob = new Blob([JSON.stringify(updatedData, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = 'respuestas_actualizadas.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setAllForms([]);
      })
      .catch(error => {
        console.error('Error al cargar el archivo JSON:', error);
      });
  };



  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-center text-[var(--blue)] mb-8">Encuesta Censo</h1>
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-8 space-y-6">
        {currentQuestions.map((question, index) => {
          if (question.type === "subtitle") {
            return (
              <h3 key={question.id} className="text-xl font-semibold text-gray-800 mb-4">
                {question.text}
              </h3>
            );
          }
          if (question.type === "radiobutton_group") {
            return (
              <div key={question.id} className="mb-4">
                <label className="block text-lg font-semibold text-gray-700 mb-2">{question.label}</label>
                <div className="flex gap-4 items-center">
                  {question.options.map((option, idx) => (
                    <label key={`${question.id}-${idx}`} className="inline-flex items-center">
                      <input type="radio" name={question.id} value={option} onChange={() => handleRadioChange(question.ask, option)} className="form-radio h-5 w-5 text-blue-600"/>
                      <span className="ml-2 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          }          
          return (
            <div key={question.id} className="mb-4">
              <label htmlFor={question.id} className="block text-lg font-semibold text-gray-700">
                {question.label}
              </label>
              <input type="text" id={question.id} name={question.id} value={formData[question.id] || ""} onChange={handleChange} placeholder={`Ingresa tu respuesta para ${question.label}`} className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"/>
            </div>
          );
        })}

        <div className="flex justify-between">
          {currentPage > 0 && (
            <button
              type="button"
              onClick={handlePrevious}
              className="py-3 px-4 bg-gray-600 text-white font-semibold rounded-md shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Anterior
            </button>
          )}

          {currentPage < totalPages - 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="py-3 px-4 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Siguiente
            </button>
          )}

          {currentPage === totalPages - 1 && (
            <button
              type="submit"
              className="py-3 px-4 bg-green-600 text-white font-semibold rounded-md shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Enviar
            </button>
          )}
        </div>
      </form>

      <div className="mt-6 text-right">
        <button
          type="button"
          onClick={exportToJson}
          className="py-3 px-4 bg-indigo-600 text-white font-semibold rounded-md shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Exportar Respuestas
        </button>
      </div>

      <div className="mt-6 text-right">
        <RunScriptButton/>
      </div>
    </div>
  );
}

