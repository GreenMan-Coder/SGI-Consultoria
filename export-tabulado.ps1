param (
    [string]$JsonPath1,  # Ruta de json formulario
    [string]$JsonPath2,  # Ruta de json esquema
    [string]$ExcelPath   # Ruta Excel Template
)
Import-Module ImportExcel -Force

# Verificar si los archivos JSON existen
if (!(Test-Path $JsonPath1)) {
    echo "El archivo json formulario no existe en la ruta especificada: $JsonPath1"
    exit
}
if (!(Test-Path $JsonPath2)) {
    echo "El archivo json esquema no existe en la ruta especificada: $JsonPath2"
    exit
}

# Leer claves de JSON
function Extract-ResponseKeys {
    param (
        [object]$JsonObject
    )
    $FilteredKeys = @{}
    function Traverse-Json {
        param (
            [object]$JsonObject
        )
        foreach ($key in $JsonObject.PSObject.Properties.Name) {
            if ($key -match "^Respuesta (\d+)$") {
                $FilteredKeys[$key] = $JsonObject.$key
            }
            $value = $JsonObject.$key
            if ($value -is [PSCustomObject]) {
                Traverse-Json -JsonObject $value
            } elseif ($value -is [array]) {
                foreach ($item in $value) {
                    if ($item -is [PSCustomObject]) {
                        Traverse-Json -JsonObject $item
                    }
                }
            }
        }
    }
    Traverse-Json -JsonObject $JsonObject
    return $FilteredKeys
}

# Extraer claves
$JsonContent1 = Get-Content -Path $JsonPath1 -Raw | ConvertFrom-Json
$FilteredJson = Extract-ResponseKeys -JsonObject $JsonContent1
$JsonContent2 = Get-Content -Path $JsonPath2 -Raw | ConvertFrom-Json


$result = @{}

foreach ($key in $FilteredJson.Keys){
	if (-not [string]::IsNullOrEmpty($FilteredJson[$key])){
		if ($JsonContent2.PSObject.Properties.Name -contains $key) {
			$result[$JsonContent2.$key] = $FilteredJson[$key]
		}
	}
}

# Verificar si el archivo de Excel existe
if (!(Test-Path $ExcelPath)) {
    echo "El archivo de Excel no existe en la ruta especificada: $ExcelPath"
    exit
}

# Cargar el archivo de Excel existente y seleccionar la hoja de cálculo "FORMATO"
$ExcelPackage = Open-ExcelPackage -Path $ExcelPath
$Worksheet = $ExcelPackage.Workbook.Worksheets["FORMATO"]
if ($null -eq $Worksheet) {
    echo "No se encontró la hoja de cálculo 'FORMATO'."
    exit
}

#Llenar formato
function Write-HashtableToExcel {
	param (
		[hashtable]$Data,
        [object]$Worksheet
	)
	
	foreach ($key in $Data.Keys) {
		$cell = $Worksheet.Cells[$key]
		$cell.value = $Data[$key]
	}
}

write-HashtableToExcel -Data $result -Worksheet $Worksheet

# Guardar y cerrar el archivo Excel
$ExcelPackage.Save()
Close-ExcelPackage -ExcelPackage $ExcelPackage
