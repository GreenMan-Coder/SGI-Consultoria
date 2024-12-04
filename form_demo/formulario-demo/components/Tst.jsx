'use client'

import { useEffect, useState } from 'react'

export default function Tst () {
    const [date, setDate] = useState(null)
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)

    const handleDateClick = (day, month, year) => {
        setDate(new Date(year, month, day))
        setIsCalendarOpen(false)
    }

    const [formData, setFormData] = useState({})
    const [currentPage, setCurrentPage] = useState(0)
    const [questions, setQuestions] = useState([])
    const [totalPages, setTotalPages] = useState(0)
    const [allForms, setAllForms] = useState([])
    const questionsPerPage = 10 // Cantidad de páginas
    let globalIndex = 0// Índice incremental para garantizar claves únicas

    const parseQuestions = (data, level = 0) => {
        let parsedQuestions = []
        for (const [key, value] of Object.entries(data)) { // recorre cada clave del JSON
            let questionNumber = null
            for (const subKey of Object.keys(value)) {
                const match = subKey.match(/Pregunta (\d+)/)
                if (match) {
                    questionNumber = match[1] // Almacena el número de la pregunta
                    break // Sale del bucle una vez que se encuentra el primer número
                }
            }
            if (typeof value === 'object' && !Array.isArray(value)) { // Si es un objeto
                const cleanKey = key.includes('Pregunta_') ? key.replace('Pregunta_', '') : key // Limpia los subtitulos
                const allRadioButtons = Object.values(value).every(// verifique si todos hijos son radiobutton
                    (val) => typeof val === 'string' && val.includes('_radiobutton')
                )
                if (allRadioButtons) {
                    parsedQuestions.push({ // Agrupar los radio buttons bajo la clave de la pregunta
                        id: `${cleanKey}-${globalIndex++}`,
                        ask: `question-${questionNumber}`,
                        label: cleanKey,
                        type: 'radiobutton_group',
                        options: Object.values(value).map((val) => val.replace('_radiobutton', ''))
                    })
                } else {
                    const radioButtons = []
                    let questionNumber2 = null
                    for (const subKey of Object.keys(value)) {
                        console.log('value[subKey]: ', value[subKey])
                        if (typeof value[subKey] === 'string' && value[subKey].includes('_radiobutton')) {
                            radioButtons.push(subKey) // Guardar las claves de los radiobuttons
                        }
                    }
                    if (radioButtons.length > 1) {
                        for (const key of radioButtons) {
                            console.log('Key: ', key)
                            const match = key.match(/Pregunta (\d+)/) // Buscar el número después de "Pregunta"
                            if (match) {
                                console.log('match: ', match)
                                questionNumber2 = match[1] // Almacenar el número encontrado
                                break
                            }
                        }
                    }
                    if (questionNumber2) {
                        parsedQuestions.push({
                            id: `${key}-${globalIndex++}`,
                            ask: `question-${questionNumber2}`,
                            label: cleanKey,
                            type: 'radiobutton_group',
                            options: radioButtons.map((key) => value[key].replace('_radiobutton', ''))
                        })
                    }
                    parsedQuestions.push({ type: 'subtitle', text: cleanKey, id: `subtitle-${globalIndex++}` })
                }
                parsedQuestions = parsedQuestions.concat(parseQuestions(value, level + 1)) // Verifica niveles jerarquicos
                // }
            } else if (key.includes('Pregunta') && !value.includes('_radiobutton') && !value.includes('_date')) { // Logica para manejar preguntas abiertas
                parsedQuestions.push({
                    id: `${key}-${globalIndex++}`, // Clave única para cada pregunta
                    ask: `question-${questionNumber}`,
                    label: value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(), //
                    type: 'text', // Tipo de input
                    options: null
                })
            }
        }

        return parsedQuestions
    }

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const response = await fetch('/questions-pedrial-eia-bucare.json')
                const data = await response.json()
                const parsedQuestions = parseQuestions(data)
                setQuestions(parsedQuestions)
                setTotalPages(Math.ceil(parsedQuestions.length / questionsPerPage))
            } catch (error) {
                console.error('Error al cargar las preguntas:', error)
            }
        }

        fetchQuestions()
    }, [])

    const currentQuestions = questions.slice(
        currentPage * questionsPerPage,
        currentPage * questionsPerPage + questionsPerPage
    )

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleRadioChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: `x_${value.toLowerCase()}` }))
    }

    const handleNext = () => {
        if (currentPage < totalPages - 1) setCurrentPage((prev) => prev + 1)
    }

    const handlePrevious = () => {
        if (currentPage > 0) setCurrentPage((prev) => prev - 1)
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        setAllForms((prev) => [...prev, { ...formData }])
        setFormData({})
        setCurrentPage(0)
        console.log('Formulario enviado:', formData)
    }

    // Archivo JSON con formularios
    const exportToJson = () => {
        // Crear el objeto de datos a exportar a partir de allForms
        const dataToExport = {}
        allForms.forEach((form, index) => {
            dataToExport[`formulario#${index + 1}`] = form
        })

        // Cargar el archivo 'responses-pedrial-eia-bucare.json' como base
        fetch('/responses-pedrial-eia-bucare.json')
            .then(response => response.json())
            .then(existingData => {
                const updatedData = { ...existingData }// Crear una copia del archivo existente para dejarlo sin cambios
                const findAndAssignValue = (obj, keyToFind, valueToAssign) => {
                    for (const key in obj) {
                        if (obj.hasOwnProperty(key)) {
                            if (key === keyToFind) {
                                obj[key] = valueToAssign
                                return true
                            }
                            if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                                // Si es un objeto, se llama recursivamente para buscar en el subobjeto
                                if (findAndAssignValue(obj[key], keyToFind, valueToAssign)) {
                                    return true
                                }
                            }
                        }
                    }
                    return false // Si no se encuentra la clave, se devuelve false
                }

                function iterateKeysRecursively (obj) {
                    Object.keys(obj).forEach(key => {
                        const questionNumber = key.match(/(\d+)/) // Extraer el número de la clave en dataToExport
                        if (questionNumber && questionNumber[0] && !key.includes('formulario')) {
                            const matchingKey = `Respuesta ${questionNumber[0]}`
                            const valueAssigned = findAndAssignValue(updatedData, matchingKey, obj[key])
                        } else {
                            console.log(`Clave '${key}' no cumple con las condiciones.`)
                        }
                        // Si el valor es un objeto, llamar a la función recursivamente
                        if (typeof obj[key] === 'object' && obj[key] !== null) {
                            iterateKeysRecursively(obj[key])
                        }
                    })
                }
                // Iterar sobre cada formulario en el estado para comparar con el archivo existente
                iterateKeysRecursively(dataToExport)

                // SE DEBE IR AQUI PARA LA BASE DE DATOS

                // Crear un blob para la exportación de la copia actualizada
                const blob = new Blob([JSON.stringify(updatedData, null, 2)], {
                    type: 'application/json'
                })
                const url = URL.createObjectURL(blob)

                const link = document.createElement('a')
                link.href = url
                link.download = 'respuestas_actualizadas.json'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                setAllForms([])
            })
            .catch(error => {
                console.error('Error al cargar el archivo JSON:', error)
            })
    }

    return (
        <div className="min-h-screen bg-slate-900 p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-3xl bg-slate-800 text-slate-100 shadow-xl rounded-lg overflow-hidden">
                <div className="text-center space-y-1">
                    <img src="/img/logo/log-op.png" alt="logo" className="h-16 m-auto my-[1.5em]"/>
                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#FFD700] to-[#90EE90] bg-clip-text text-transparent">
                    	Información Socio-Económica y Cultural
                    </h1>
                    <p className="text-slate-400">
                    	Por favor complete todos los campos del formulario
                    </p>
                </div>
                <div className="h-1 width-full bg-slate-700 rounded-lg mx-[1em] mt-[1em]"></div>
                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {currentQuestions.map((question, index) => {
                            if (question.type === 'subtitle') {
                                return (
                                    <h2 key={question.id} className="text-lg font-semibold text-[#90EE90]">{question.text}</h2>
                                )
                            }
                            if (question.type === 'radiobutton_group') {
                                return (
                                    <div key={question.id} className="mb-4">
                                        <label className="block text-lg text-white mb-2">{question.label}</label>
                                        <div className="flex gap-5 items-center">
                                            {question.options.map((option, idx) => (
                                                <label key={`${question.id}-${idx}`} className="inline-flex items-center">
                                                    <input type="radio" name={question.id} value={option} onChange={() => handleRadioChange(question.ask, option)} className="form-radio h-4 w-4 "/>
                                                    <span className="ml-2 text-gray-400 lowercase">{option}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )
                            }
                            return (
                                <div key={question.id} className="mb-4">
                                    <label htmlFor={question.id} className="block text-lg font-normal text-white">
                                        {question.label}
                                    </label>
                                    <input
                                        id={question.id}
                                        name={question.id}
                                        type="text"
                                        value={formData[question.id] || ''} onChange={handleChange} placeholder={'Ingresa tu respuesta'}
                                        className="w-full mt-3 px-3 py-2 bg-transparent border border-slate-600 rounded-md text-slate-100 placeholder-slate-400"
                                    />
                                </div>
                            )
                        })}
                        <div className="flex justify-between items-center">
                            {currentPage > 0 && (
                                <button
                                    type="button"
                                    onClick={handlePrevious}
                                    className="px-3 py-2 text-left font-normal  font-semibold border border-slate-600 rounded-md shadow-md text-slate-100 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                                >
                                  Anterior
                                </button>
                            )}

                            {currentPage < totalPages - 1 && (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="px-3 py-2 text-slate-100 border border-slate-600 rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2"
                                >
                                  Siguiente
                                </button>
                            )}

                            {currentPage === totalPages - 1 && (
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                >
                                  Enviar
                                </button>
                            )}
                            <div className="text-right">
                                <button
                                    type="button"
                                    onClick={exportToJson}
                                    className="py-3 px-4 bg-gradient-to-r from-[#FFD700] to-[#90EE90] text-black font-medium rounded-md shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                  					Exportar Respuestas
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
