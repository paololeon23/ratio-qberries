/* Supervisores / jefes por grupo LIC · padrón por fecha de cosecha */
window.QB = window.QB || {};

QB.supervisors = {
  /**
   * activo:false = baja / sin LIC asignado (no aparece en lookup).
   * @type {{nombre:string,dni:string,lic:string,fecha:string,activo?:boolean,nota?:string}[]}
   */
  rows: [
    /* —— 2026-08-25 (36 asignaciones · planilla del día) —— */
    { nombre: 'PURIZAGA SAAVEDRA PIERRE OSNAR', dni: '70192702', lic: 'LIC 24', fecha: '2026-08-25' },
    { nombre: 'DIAZ VARAS FANNY DEL MILAGRO', dni: '43558894', lic: 'LIC 01', fecha: '2026-08-25' },
    { nombre: 'REBAZA SALINAS ALEXANDER YONATHAN', dni: '60836174', lic: 'LIC 42', fecha: '2026-08-25' },
    { nombre: 'TIRADO VERGARA FIORELLA VERENISE', dni: '74068569', lic: 'LIC 64', fecha: '2026-08-25' },
    { nombre: 'CHACON BERMUDEZ NADIA SARAHI', dni: '77146080', lic: 'LIC 13', fecha: '2026-08-25' },
    { nombre: 'JULCA GAMBOA DILMER ELICER', dni: '48533707', lic: 'LIC 15', fecha: '2026-08-25' },
    { nombre: 'PEÑA ROJAS LAURA PATRICIA', dni: '45372928', lic: 'LIC 11', fecha: '2026-08-25' },
    { nombre: 'LLAQUE ARGOMEDO GENESIS GUILIANA KEIKO', dni: '70559269', lic: 'LIC 05', fecha: '2026-08-25' },
    { nombre: 'CUEVA GUILLERMO KENNET ANDERSON', dni: '71880419', lic: 'LIC 53', fecha: '2026-08-25' },
    { nombre: 'TRONCOSO SANCHEZ HENRY BRAULIO', dni: '73634792', lic: 'LIC 35', fecha: '2026-08-25' },
    { nombre: 'GUARNIZ MARREROS NELIXA VIVIANA', dni: '63249902', lic: 'LIC 44', fecha: '2026-08-25' },
    { nombre: 'ROJAS AREDO YERSI YEN', dni: '75141739', lic: 'LIC 27', fecha: '2026-08-25' },
    { nombre: 'NAMOC NARRO BIVIANA DE LOS ANGELES', dni: '74047419', lic: 'LIC 59', fecha: '2026-08-25' },
    { nombre: 'TORRES GONZALEZ DE AQUINO MARTHA KARINA', dni: '72961122', lic: 'LIC 52', fecha: '2026-08-25' },
    { nombre: 'PLASENCIA CORREA NADIA YVONNE', dni: '43583858', lic: 'LIC 02', fecha: '2026-08-25' },
    { nombre: 'HUAMAN ESPARZA EDELMIRA', dni: '77160560', lic: 'LIC 18', fecha: '2026-08-25' },
    { nombre: 'CHAVEZ ALVA CARLOS ENRIQUE', dni: '45206311', lic: 'LIC 10', fecha: '2026-08-25' },
    { nombre: 'HUARIPATA RAMIREZ PATRICK ALEJANDRO', dni: '74291763', lic: 'LIC 03', fecha: '2026-08-25' },
    { nombre: 'NORIEGA PONTE MICELY', dni: '48268173', lic: 'LIC 34', fecha: '2026-08-25' },
    { nombre: 'FUENTES VALIENTE DEIMAR ULISES', dni: '74942842', lic: 'LIC 60', fecha: '2026-08-25' },
    { nombre: 'CASIANO CABRERA JAYNI PAMELA', dni: '70135405', lic: 'LIC 41', fecha: '2026-08-25' },
    { nombre: 'HERRERA ALBERCA MARIELA', dni: '61512235', lic: 'LIC 55', fecha: '2026-08-25' },
    { nombre: 'VERGARA DAVILA KELINDA ELIZABETH', dni: '47117035', lic: 'LIC 08', fecha: '2026-08-25' },
    { nombre: 'LUCANO MALCA MOISES', dni: '76261283', lic: 'LIC 58', fecha: '2026-08-25' },
    { nombre: 'VILCA BRICEÑO ALEXANDRA MARIA LAURA', dni: '76986313', lic: 'LIC 38', fecha: '2026-08-25' },
    { nombre: 'VEGA BENITES WILMER CHANEL', dni: '70875214', lic: 'LIC 56', fecha: '2026-08-25' },
    { nombre: 'HILARIO AVALOS EVELYN', dni: '48446147', lic: 'LIC 17', fecha: '2026-08-25' },
    { nombre: 'MIRANDA PALACIOS ERNESTINA EVELYN', dni: '70132627', lic: 'LIC 06', fecha: '2026-08-25' },
    { nombre: 'NAVEZ CARBAJAL YOVER OSWALDO', dni: '76774075', lic: 'LIC 04', fecha: '2026-08-25' },
    { nombre: 'PAREDES GALARRETA CRISTHIAN JEANPIER', dni: '60741145', lic: 'LIC 26', fecha: '2026-08-25' },
    { nombre: 'RIOS MEDINA DAHIRA MICAELA', dni: '60467254', lic: 'LIC 62', fecha: '2026-08-25' },
    { nombre: 'HERRERA ALBERCA PAMELA', dni: '77534125', lic: 'LIC 25', fecha: '2026-08-25' },
    { nombre: 'UCEDA ARIAS JOEL ALEXANDER', dni: '70657242', lic: 'LIC 39', fecha: '2026-08-25' },
    { nombre: 'LEON TRIGOSO JHONY ANDRONICO', dni: '71806261', lic: 'LIC 12', fecha: '2026-08-25' },
    { nombre: 'RODRIGUEZ CABRERA KENYI JENNY', dni: '70507014', lic: 'LIC 07', fecha: '2026-08-25' },
    { nombre: 'PAREDES GALARRETA CRISTHIAN JEANPIER', dni: '60741145', lic: 'LIC 04', fecha: '2026-08-25' },

    /* —— 2026-08-26 (32 asignaciones) —— */
    { nombre: 'DIAZ VARAS FANNY DEL MILAGRO', dni: '43558894', lic: 'LIC 57', fecha: '2026-08-26' },
    { nombre: 'PEÑA ROJAS LAURA PATRICIA', dni: '45372928', lic: 'LIC 11', fecha: '2026-08-26' },
    { nombre: 'HUARIPATA RAMIREZ PATRICK ALEJANDRO', dni: '74291763', lic: 'LIC 03', fecha: '2026-08-26' },
    { nombre: 'HERRERA ALBERCA PAMELA', dni: '77534125', lic: 'LIC 25', fecha: '2026-08-26' },
    { nombre: 'HUAMAN ESPARZA EDELMIRA', dni: '77160560', lic: 'LIC 43', fecha: '2026-08-26' },
    { nombre: 'LLAQUE ARGOMEDO GENESIS GUILIANA KEIKO', dni: '70559269', lic: 'LIC 05', fecha: '2026-08-26' },
    { nombre: 'JULCA GAMBOA DILMER ELICER', dni: '48533707', lic: 'LIC 15', fecha: '2026-08-26' },
    { nombre: 'LUCANO MALCA MOISES', dni: '76261283', lic: 'LIC 58', fecha: '2026-08-26' },
    { nombre: 'MEZA HUAMAN ELIAS ELISEO', dni: '78011755', lic: 'LIC 63', fecha: '2026-08-26' },
    { nombre: 'GUARNIZ MARREROS NELIXA VIVIANA', dni: '63249902', lic: 'LIC 44', fecha: '2026-08-26' },
    { nombre: 'VERGARA DAVILA KELINDA ELIZABETH', dni: '47117035', lic: 'LIC 08', fecha: '2026-08-26' },
    { nombre: 'PLASENCIA CORREA NADIA YVONNE', dni: '43583858', lic: 'LIC 02', fecha: '2026-08-26' },
    { nombre: 'CHACON BERMUDEZ NADIA SARAHI', dni: '77146080', lic: 'LIC 13', fecha: '2026-08-26' },
    { nombre: 'REBAZA SALINAS ALEXANDER YONATHAN', dni: '60836174', lic: 'LIC 42', fecha: '2026-08-26' },
    { nombre: 'HERRERA ALBERCA MARIELA', dni: '61512235', lic: 'LIC 55', fecha: '2026-08-26' },
    { nombre: 'VEGA BENITES WILMER CHANEL', dni: '70875214', lic: 'LIC 56', fecha: '2026-08-26' },
    { nombre: 'NORIEGA PONTE MICELY', dni: '48268173', lic: 'LIC 34', fecha: '2026-08-26' },
    { nombre: 'PAREDES GALARRETA CRISTHIAN JEANPIER', dni: '60741145', lic: 'LIC 26', fecha: '2026-08-26' },
    { nombre: 'NAMOC NARRO BIVIANA DE LOS ANGELES', dni: '74047419', lic: 'LIC 59', fecha: '2026-08-26' },
    { nombre: 'TIRADO VERGARA FIORELLA VERENISE', dni: '74068569', lic: 'LIC 64', fecha: '2026-08-26' },
    { nombre: 'CASIANO CABRERA JAYNI PAMELA', dni: '70135405', lic: 'LIC 41', fecha: '2026-08-26' },
    { nombre: 'VILCA BRICEÑO ALEXANDRA MARIA LAURA', dni: '76986313', lic: 'LIC 38', fecha: '2026-08-26' },
    { nombre: 'ROJAS AREDO YERSI YEN', dni: '75141739', lic: 'LIC 27', fecha: '2026-08-26' },
    { nombre: 'NAVEZ CARBAJAL YOVER OSWALDO', dni: '76774075', lic: 'LIC 04', fecha: '2026-08-26' },
    { nombre: 'CUEVA GUILLERMO KENNET ANDERSON', dni: '71880419', lic: 'LIC 53', fecha: '2026-08-26' },
    { nombre: 'UCEDA ARIAS JOEL ALEXANDER', dni: '70657242', lic: 'LIC 39', fecha: '2026-08-26' },
    { nombre: 'CHAVEZ ALVA CARLOS ENRIQUE', dni: '45206311', lic: 'LIC 10', fecha: '2026-08-26' },
    { nombre: 'TORRES GONZALEZ DE AQUINO MARTHA KARINA', dni: '72961122', lic: 'LIC 52', fecha: '2026-08-26' },
    { nombre: 'SALAZAR AURORA INGRID JHOANA', dni: '75075892', lic: 'LIC 18', fecha: '2026-08-26' },
    { nombre: 'LEON TRIGOSO JHONY ANDRONICO', dni: '71806261', lic: 'LIC 12', fecha: '2026-08-26' },
    { nombre: 'FUENTES VALIENTE DEIMAR ULISES', dni: '74942842', lic: 'LIC 60', fecha: '2026-08-26' },
    { nombre: 'RODRIGUEZ CABRERA KENYI JENNY', dni: '70507014', lic: 'LIC 07', fecha: '2026-08-26' },

    /* —— 2026-08-27 (29 asignaciones) —— */
    { nombre: 'VERGARA DAVILA KELINDA ELIZABETH', dni: '47117035', lic: 'LIC 08', fecha: '2026-08-27' },
    { nombre: 'CHAVEZ ALVA CARLOS ENRIQUE', dni: '45206311', lic: 'LIC 10', fecha: '2026-08-27' },
    { nombre: 'HERRERA ALBERCA PAMELA', dni: '77534125', lic: 'LIC 25', fecha: '2026-08-27' },
    { nombre: 'PAREDES GALARRETA CRISTHIAN JEANPIER', dni: '60741145', lic: 'LIC 26', fecha: '2026-08-27' },
    { nombre: 'PLASENCIA CORREA NADIA YVONNE', dni: '43583858', lic: 'LIC 02', fecha: '2026-08-27' },
    { nombre: 'CHACON BERMUDEZ NADIA SARAHI', dni: '77146080', lic: 'LIC 13', fecha: '2026-08-27' },
    { nombre: 'HUAMAN ESPARZA EDELMIRA', dni: '77160560', lic: 'LIC 43', fecha: '2026-08-27' },
    { nombre: 'CASIANO CABRERA JAYNI PAMELA', dni: '70135405', lic: 'LIC 41', fecha: '2026-08-27' },
    { nombre: 'HERRERA ALBERCA MARIELA', dni: '61512235', lic: 'LIC 55', fecha: '2026-08-27' },
    { nombre: 'GUARNIZ MARREROS NELIXA VIVIANA', dni: '63249902', lic: 'LIC 44', fecha: '2026-08-27' },
    { nombre: 'ROJAS AREDO YERSI YEN', dni: '75141739', lic: 'LIC 27', fecha: '2026-08-27' },
    { nombre: 'VILCA BRICEÑO ALEXANDRA MARIA LAURA', dni: '76986313', lic: 'LIC 38', fecha: '2026-08-27' },
    { nombre: 'PEÑA ROJAS LAURA PATRICIA', dni: '45372928', lic: 'LIC 11', fecha: '2026-08-27' },
    { nombre: 'DIAZ VARAS FANNY DEL MILAGRO', dni: '43558894', lic: 'LIC 57', fecha: '2026-08-27' },
    { nombre: 'LUCANO MALCA MOISES', dni: '76261283', lic: 'LIC 58', fecha: '2026-08-27' },
    { nombre: 'FUENTES VALIENTE DEIMAR ULISES', dni: '74942842', lic: 'LIC 60', fecha: '2026-08-27' },
    { nombre: 'PURIZAGA SAAVEDRA PIERRE OSNAR', dni: '70192702', lic: 'LIC 24', fecha: '2026-08-27' },
    { nombre: 'NAVEZ CARBAJAL YOVER OSWALDO', dni: '76774075', lic: 'LIC 04', fecha: '2026-08-27' },
    { nombre: 'NORIEGA PONTE MICELY', dni: '48268173', lic: 'LIC 34', fecha: '2026-08-27' },
    { nombre: 'HUARIPATA RAMIREZ PATRICK ALEJANDRO', dni: '74291763', lic: 'LIC 03', fecha: '2026-08-27' },
    { nombre: 'SALAZAR AURORA INGRID JHOANA', dni: '75075892', lic: 'LIC 18', fecha: '2026-08-27' },
    { nombre: 'RIOS MEDINA DAHIRA MICAELA', dni: '60467254', lic: 'LIC 62', fecha: '2026-08-27' },
    { nombre: 'RODRIGUEZ CABRERA KENYI JENNY', dni: '70507014', lic: 'LIC 07', fecha: '2026-08-27' },
    { nombre: 'UCEDA ARIAS JOEL ALEXANDER', dni: '70657242', lic: 'LIC 39', fecha: '2026-08-27' },
    { nombre: 'LEON TRIGOSO JHONY ANDRONICO', dni: '71806261', lic: 'LIC 12', fecha: '2026-08-27' },
    { nombre: 'TRONCOSO SANCHEZ HENRY BRAULIO', dni: '73634792', lic: 'LIC 35', fecha: '2026-08-27' },
    { nombre: 'VEGA BENITES WILMER CHANEL', dni: '70875214', lic: 'LIC 56', fecha: '2026-08-27' },
    { nombre: 'CUEVA GUILLERMO KENNET ANDERSON', dni: '71880419', lic: 'LIC 53', fecha: '2026-08-27' },
    { nombre: 'REBAZA SALINAS ALEXANDER YONATHAN', dni: '60836174', lic: 'LIC 42', fecha: '2026-08-27' },

    /* —— 2026-08-28 (3 asignaciones) —— */
    { nombre: 'SALAZAR AURORA INGRID JHOANA', dni: '75075892', lic: 'LIC 18', fecha: '2026-08-28' },
    { nombre: 'LEON TRIGOSO JHONY ANDRONICO', dni: '71806261', lic: 'LIC 12', fecha: '2026-08-28' },
    { nombre: 'GUARNIZ MARREROS NELIXA VIVIANA', dni: '63249902', lic: 'LIC 44', fecha: '2026-08-28' },

    /* —— 2026-08-31 (29 asignaciones) —— */
    { nombre: 'NORIEGA PONTE MICELY', dni: '48268173', lic: 'LIC 34', fecha: '2026-08-31' },
    { nombre: 'JULCA GAMBOA DILMER ELICER', dni: '48533707', lic: 'LIC 15', fecha: '2026-08-31' },
    { nombre: 'VERGARA DAVILA KELINDA ELIZABETH', dni: '47117035', lic: 'LIC 08', fecha: '2026-08-31' },
    { nombre: 'HERRERA ALBERCA MARIELA', dni: '61512235', lic: 'LIC 55', fecha: '2026-08-31' },
    { nombre: 'HUARIPATA RAMIREZ PATRICK ALEJANDRO', dni: '74291763', lic: 'LIC 03', fecha: '2026-08-31' },
    { nombre: 'LLAQUE ARGOMEDO GENESIS GUILIANA KEIKO', dni: '70559269', lic: 'LIC 05', fecha: '2026-08-31' },
    { nombre: 'HERRERA ALBERCA PAMELA', dni: '77534125', lic: 'LIC 25', fecha: '2026-08-31' },
    { nombre: 'PLASENCIA CORREA NADIA YVONNE', dni: '43583858', lic: 'LIC 02', fecha: '2026-08-31' },
    { nombre: 'FUENTES VALIENTE DEIMAR ULISES', dni: '74942842', lic: 'LIC 60', fecha: '2026-08-31' },
    { nombre: 'NAVEZ CARBAJAL YOVER OSWALDO', dni: '76774075', lic: 'LIC 04', fecha: '2026-08-31' },
    { nombre: 'CHACON BERMUDEZ NADIA SARAHI', dni: '77146080', lic: 'LIC 13', fecha: '2026-08-31' },
    { nombre: 'CHAVEZ ALVA CARLOS ENRIQUE', dni: '45206311', lic: 'LIC 10', fecha: '2026-08-31' },
    { nombre: 'ROJAS AREDO YERSI YEN', dni: '75141739', lic: 'LIC 27', fecha: '2026-08-31' },
    { nombre: 'ARMAS DIAZ CRISTIAN DANIEL', dni: '74959924', lic: 'LIC 36', fecha: '2026-08-31' },
    { nombre: 'DIAZ VARAS FANNY DEL MILAGRO', dni: '43558894', lic: 'LIC 57', fecha: '2026-08-31' },
    { nombre: 'RODRIGUEZ CABRERA KENYI JENNY', dni: '70507014', lic: 'LIC 07', fecha: '2026-08-31' },
    { nombre: 'CASIANO CABRERA JAYNI PAMELA', dni: '70135405', lic: 'LIC 41', fecha: '2026-08-31' },
    { nombre: 'VEGA BENITES WILMER CHANEL', dni: '70875214', lic: 'LIC 56', fecha: '2026-08-31' },
    { nombre: 'REBAZA SALINAS ALEXANDER YONATHAN', dni: '60836174', lic: 'LIC 42', fecha: '2026-08-31' },
    { nombre: 'HILARIO AVALOS EVELYN', dni: '48446147', lic: 'LIC 17', fecha: '2026-08-31' },
    { nombre: 'PAREDES GALARRETA CRISTHIAN JEANPIER', dni: '60741145', lic: 'LIC 26', fecha: '2026-08-31' },
    { nombre: 'RIOS MEDINA DAHIRA MICAELA', dni: '60467254', lic: 'LIC 62', fecha: '2026-08-31' },
    { nombre: 'PURIZAGA SAAVEDRA PIERRE OSNAR', dni: '70192702', lic: 'LIC 24', fecha: '2026-08-31' },
    { nombre: 'VILCA BRICEÑO ALEXANDRA MARIA LAURA', dni: '76986313', lic: 'LIC 38', fecha: '2026-08-31' },
    { nombre: 'NAMOC NARRO BIVIANA DE LOS ANGELES', dni: '74047419', lic: 'LIC 59', fecha: '2026-08-31' },
    { nombre: 'CUEVA GUILLERMO KENNET ANDERSON', dni: '71880419', lic: 'LIC 53', fecha: '2026-08-31' },
    { nombre: 'PEÑA ROJAS LAURA PATRICIA', dni: '45372928', lic: 'LIC 11', fecha: '2026-08-31' },
    { nombre: 'LUCANO MALCA MOISES', dni: '76261283', lic: 'LIC 43', fecha: '2026-08-31' },
    { nombre: 'LEON TRIGOSO JHONY ANDRONICO', dni: '71806261', lic: 'LIC 18', fecha: '2026-08-31' },

    /* —— 2026-09-01 (según padrón de descartes del día) —— */
    { nombre: 'PLASENCIA CORREA NADIA YVONNE', dni: '43583858', lic: 'LIC 02', fecha: '2026-09-01' },
    { nombre: 'HUARIPATA RAMIREZ PATRICK ALEJANDRO', dni: '74291763', lic: 'LIC 03', fecha: '2026-09-01' },
    { nombre: 'NAVEZ CARBAJAL YOVER OSWALDO', dni: '76774075', lic: 'LIC 04', fecha: '2026-09-01' },
    { nombre: 'LLAQUE ARGOMEDO GENESIS GUILIANA KEIKO', dni: '70559269', lic: 'LIC 05', fecha: '2026-09-01' },
    { nombre: 'CHACON BERMUDEZ NADIA SARAHI', dni: '77146080', lic: 'LIC 06', fecha: '2026-09-01' },
    { nombre: 'RODRIGUEZ CABRERA KENYI JENNY', dni: '70507014', lic: 'LIC 07', fecha: '2026-09-01' },
    { nombre: 'VERGARA DAVILA KELINDA ELIZABETH', dni: '47117035', lic: 'LIC 08', fecha: '2026-09-01' },
    { nombre: 'CHAVEZ ALVA CARLOS ENRIQUE', dni: '45206311', lic: 'LIC 10', fecha: '2026-09-01' },
    { nombre: 'PEÑA ROJAS LAURA PATRICIA', dni: '45372928', lic: 'LIC 11', fecha: '2026-09-01' },
    { nombre: 'PURIZAGA SAAVEDRA PIERRE OSNAR', dni: '70192702', lic: 'LIC 12', fecha: '2026-09-01' },
    { nombre: 'JULCA GAMBOA DILMER ELICER', dni: '48533707', lic: 'LIC 15', fecha: '2026-09-01' },
    { nombre: 'HILARIO AVALOS EVELYN', dni: '48446147', lic: 'LIC 17', fecha: '2026-09-01' },
    { nombre: 'LEON TRIGOSO JHONY ANDRONICO', dni: '71806261', lic: 'LIC 18', fecha: '2026-09-01' },
    { nombre: 'HERRERA ALBERCA PAMELA', dni: '77534125', lic: 'LIC 25', fecha: '2026-09-01' },
    { nombre: 'PAREDES GALARRETA CRISTHIAN JEANPIER', dni: '60741145', lic: 'LIC 26', fecha: '2026-09-01' },
    { nombre: 'NORIEGA PONTE MICELY', dni: '48268173', lic: 'LIC 34', fecha: '2026-09-01' },
    { nombre: 'TRONCOSO SANCHEZ HENRY BRAULIO', dni: '73634792', lic: 'LIC 35', fecha: '2026-09-01' },
    { nombre: 'ARMAS DIAZ CRISTIAN DANIEL', dni: '74959924', lic: 'LIC 36', fecha: '2026-09-01' },
    { nombre: 'VILCA BRICEÑO ALEXANDRA MARIA LAURA', dni: '76986313', lic: 'LIC 38', fecha: '2026-09-01' },
    { nombre: 'CASIANO CABRERA JAYNI PAMELA', dni: '70135405', lic: 'LIC 41', fecha: '2026-09-01' },
    { nombre: 'HUAMAN ESPARZA EDELMIRA', dni: '77160560', lic: 'LIC 43', fecha: '2026-09-01' },
    { nombre: 'CUEVA GUILLERMO KENNET ANDERSON', dni: '71880419', lic: 'LIC 53', fecha: '2026-09-01' },
    { nombre: 'HERRERA ALBERCA MARIELA', dni: '61512235', lic: 'LIC 55', fecha: '2026-09-01' },
    { nombre: 'VEGA BENITES WILMER CHANEL', dni: '70875214', lic: 'LIC 56', fecha: '2026-09-01' },
    { nombre: 'DIAZ VARAS FANNY DEL MILAGRO', dni: '43558894', lic: 'LIC 57', fecha: '2026-09-01' },
    { nombre: 'LUCANO MALCA MOISES', dni: '76261283', lic: 'LIC 58', fecha: '2026-09-01' },
    { nombre: 'FUENTES VALIENTE DEIMAR ULISES', dni: '74942842', lic: 'LIC 60', fecha: '2026-09-01' },
    { nombre: 'ANTICONA SOTO CRISTHIAN ALEXANDER', dni: '71405307', lic: 'LIC 62', fecha: '2026-09-01' },

    /* —— 2026-09-02 (según padrón de descartes del día) —— */
    { nombre: 'PLASENCIA CORREA NADIA YVONNE', dni: '43583858', lic: 'LIC 02', fecha: '2026-09-02' },
    { nombre: 'HUARIPATA RAMIREZ PATRICK ALEJANDRO', dni: '74291763', lic: 'LIC 03', fecha: '2026-09-02' },
    { nombre: 'NAVEZ CARBAJAL YOVER OSWALDO', dni: '76774075', lic: 'LIC 04', fecha: '2026-09-02' },
    { nombre: 'LLAQUE ARGOMEDO GENESIS GUILIANA KEIKO', dni: '70559269', lic: 'LIC 05', fecha: '2026-09-02' },
    { nombre: 'CHACON BERMUDEZ NADIA SARAHI', dni: '77146080', lic: 'LIC 06', fecha: '2026-09-02' },
    { nombre: 'RODRIGUEZ CABRERA KENYI JENNY', dni: '70507014', lic: 'LIC 07', fecha: '2026-09-02' },
    { nombre: 'VERGARA DAVILA KELINDA ELIZABETH', dni: '47117035', lic: 'LIC 08', fecha: '2026-09-02' },
    { nombre: 'PEÑA ROJAS LAURA PATRICIA', dni: '45372928', lic: 'LIC 11', fecha: '2026-09-02' },
    { nombre: 'JULCA GAMBOA DILMER ELICER', dni: '48533707', lic: 'LIC 15', fecha: '2026-09-02' },
    { nombre: 'HILARIO AVALOS EVELYN', dni: '48446147', lic: 'LIC 17', fecha: '2026-09-02' },
    { nombre: 'LEON TRIGOSO JHONY ANDRONICO', dni: '71806261', lic: 'LIC 18', fecha: '2026-09-02' },
    { nombre: 'PURIZAGA SAAVEDRA PIERRE OSNAR', dni: '70192702', lic: 'LIC 24', fecha: '2026-09-02' },
    { nombre: 'HERRERA ALBERCA PAMELA', dni: '77534125', lic: 'LIC 25', fecha: '2026-09-02' },
    { nombre: 'PAREDES GALARRETA CRISTHIAN JEANPIER', dni: '60741145', lic: 'LIC 26', fecha: '2026-09-02' },
    { nombre: 'ROJAS AREDO YERSI YEN', dni: '75141739', lic: 'LIC 27', fecha: '2026-09-02' },
    { nombre: 'NORIEGA PONTE MICELY', dni: '48268173', lic: 'LIC 34', fecha: '2026-09-02' },
    { nombre: 'TRONCOSO SANCHEZ HENRY BRAULIO', dni: '73634792', lic: 'LIC 35', fecha: '2026-09-02' },
    { nombre: 'ARMAS DIAZ CRISTIAN DANIEL', dni: '74959924', lic: 'LIC 36', fecha: '2026-09-02' },
    { nombre: 'VILCA BRICEÑO ALEXANDRA MARIA LAURA', dni: '76986313', lic: 'LIC 38', fecha: '2026-09-02' },
    { nombre: 'ANTICONA SOTO CRISTHIAN ALEXANDER', dni: '71405307', lic: 'LIC 40', fecha: '2026-09-02' },
    { nombre: 'HUAMAN ESPARZA EDELMIRA', dni: '77160560', lic: 'LIC 43', fecha: '2026-09-02' },
    { nombre: 'CUEVA GUILLERMO KENNET ANDERSON', dni: '71880419', lic: 'LIC 53', fecha: '2026-09-02' },
    { nombre: 'HERRERA ALBERCA MARIELA', dni: '61512235', lic: 'LIC 55', fecha: '2026-09-02' },
    { nombre: 'VEGA BENITES WILMER CHANEL', dni: '70875214', lic: 'LIC 56', fecha: '2026-09-02' },
    { nombre: 'DIAZ VARAS FANNY DEL MILAGRO', dni: '43558894', lic: 'LIC 57', fecha: '2026-09-02' },
    { nombre: 'LUCANO MALCA MOISES', dni: '76261283', lic: 'LIC 58', fecha: '2026-09-02' },
    { nombre: 'FUENTES VALIENTE DEIMAR ULISES', dni: '74942842', lic: 'LIC 60', fecha: '2026-09-02' },

    /* —— 2026-09-08 —— */
    { nombre: 'DELGADO ABANTO SUSAN', dni: '74959142', lic: 'LIC 28', fecha: '2026-09-08' },

    /* —— 2026-09-11 (24 asignaciones · padrón del día) —— */
    { nombre: 'PLASENCIA CORREA NADIA YVONNE', dni: '43583858', lic: 'LIC 02', fecha: '2026-09-11' },
    { nombre: 'HUARIPATA RAMIREZ PATRICK ALEJANDRO', dni: '74291763', lic: 'LIC 03', fecha: '2026-09-11' },
    { nombre: 'LLAQUE ARGOMEDO GENESIS GUILIANA KEIKO', dni: '70559269', lic: 'LIC 05', fecha: '2026-09-11' },
    { nombre: 'VERGARA DAVILA KELINDA ELIZABETH', dni: '47117035', lic: 'LIC 08', fecha: '2026-09-11' },
    { nombre: 'LOPEZ ALFARO CARMEN ROSA', dni: '72009029', lic: 'LIC 09', fecha: '2026-09-11' },
    { nombre: 'CHAVEZ ALVA CARLOS ENRIQUE', dni: '45206311', lic: 'LIC 10', fecha: '2026-09-11' },
    { nombre: 'PEÑA ROJAS LAURA PATRICIA', dni: '45372928', lic: 'LIC 11', fecha: '2026-09-11' },
    { nombre: 'JULCA GAMBOA DILMER ELICER', dni: '48533707', lic: 'LIC 15', fecha: '2026-09-11' },
    { nombre: 'HILARIO AVALOS EVELYN', dni: '48446147', lic: 'LIC 17', fecha: '2026-09-11' },
    { nombre: 'LEON TRIGOSO JHONY ANDRONICO', dni: '71806261', lic: 'LIC 18', fecha: '2026-09-11' },
    { nombre: 'PURIZAGA SAAVEDRA PIERRE OSNAR', dni: '70192702', lic: 'LIC 24', fecha: '2026-09-11' },
    { nombre: 'PAREDES GALARRETA CRISTHIAN JEANPIER', dni: '60741145', lic: 'LIC 26', fecha: '2026-09-11' },
    { nombre: 'ROJAS AREDO YERSI YEN', dni: '75141739', lic: 'LIC 27', fecha: '2026-09-11' },
    { nombre: 'NORIEGA PONTE MICELY', dni: '48268173', lic: 'LIC 34', fecha: '2026-09-11' },
    { nombre: 'VILCA BRICEÑO ALEXANDRA MARIA LAURA', dni: '76986313', lic: 'LIC 38', fecha: '2026-09-11' },
    { nombre: 'CASIANO CABRERA JAYNI PAMELA', dni: '70135405', lic: 'LIC 41', fecha: '2026-09-11' },
    { nombre: 'HUAMAN ESPARZA EDELMIRA', dni: '77160560', lic: 'LIC 43', fecha: '2026-09-11' },
    { nombre: 'PINGO CASTILLO LIZEL YVET', dni: '47540370', lic: 'LIC 45', fecha: '2026-09-11' },
    { nombre: 'CUEVA GUILLERMO KENNET ANDERSON', dni: '71880419', lic: 'LIC 53', fecha: '2026-09-11' },
    { nombre: 'HERRERA ALBERCA MARIELA', dni: '61512235', lic: 'LIC 55', fecha: '2026-09-11' },
    { nombre: 'HUAMAN GARCIA EMERZON ALDAHIR', dni: '60036602', lic: 'LIC 56', fecha: '2026-09-11' },
    { nombre: 'DIAZ VARAS FANNY DEL MILAGRO', dni: '43558894', lic: 'LIC 57', fecha: '2026-09-11' },
    { nombre: 'LUCANO MALCA MOISES', dni: '76261283', lic: 'LIC 58', fecha: '2026-09-11' },
    { nombre: 'FUENTES VALIENTE DEIMAR ULISES', dni: '74942842', lic: 'LIC 60', fecha: '2026-09-11' },

    /* —— 2026-09-10 (1 asignación conocida) —— */
    { nombre: 'VILCA BRICEÑO ALEXANDRA MARIA LAURA', dni: '76986313', lic: 'LIC 38', fecha: '2026-09-10' },

    /* —— 2026-09-14 (23 asignaciones · padrón del día) —— */
    { nombre: 'PLASENCIA CORREA NADIA YVONNE', dni: '43583858', lic: 'LIC 02', fecha: '2026-09-14' },
    { nombre: 'NAVEZ CARBAJAL YOVER OSWALDO', dni: '76774075', lic: 'LIC 04', fecha: '2026-09-14' },
    { nombre: 'LLAQUE ARGOMEDO GENESIS GUILIANA KEIKO', dni: '70559269', lic: 'LIC 05', fecha: '2026-09-14' },
    { nombre: 'CHACON BERMUDEZ NADIA SARAHI', dni: '77146080', lic: 'LIC 06', fecha: '2026-09-14' },
    { nombre: 'RODRIGUEZ CABRERA KENYI JENNY', dni: '70507014', lic: 'LIC 07', fecha: '2026-09-14' },
    { nombre: 'VERGARA DAVILA KELINDA ELIZABETH', dni: '47117035', lic: 'LIC 08', fecha: '2026-09-14' },
    { nombre: 'CHAVEZ ALVA CARLOS ENRIQUE', dni: '45206311', lic: 'LIC 10', fecha: '2026-09-14' },
    { nombre: 'PEÑA ROJAS LAURA PATRICIA', dni: '45372928', lic: 'LIC 11', fecha: '2026-09-14' },
    { nombre: 'JULCA GAMBOA DILMER ELICER', dni: '48533707', lic: 'LIC 15', fecha: '2026-09-14' },
    { nombre: 'REBAZA SALINAS ALEXANDER YONATHAN', dni: '60836174', lic: 'LIC 17', fecha: '2026-09-14' },
    { nombre: 'LEON TRIGOSO JHONY ANDRONICO', dni: '71806261', lic: 'LIC 18', fecha: '2026-09-14' },
    { nombre: 'PURIZAGA SAAVEDRA PIERRE OSNAR', dni: '70192702', lic: 'LIC 24', fecha: '2026-09-14' },
    { nombre: 'ROJAS AREDO YERSI YEN', dni: '75141739', lic: 'LIC 27', fecha: '2026-09-14' },
    { nombre: 'NORIEGA PONTE MICELY', dni: '48268173', lic: 'LIC 34', fecha: '2026-09-14' },
    { nombre: 'TRONCOSO SANCHEZ HENRY BRAULIO', dni: '73634792', lic: 'LIC 35', fecha: '2026-09-14' },
    { nombre: 'VILCA BRICEÑO ALEXANDRA MARIA LAURA', dni: '76986313', lic: 'LIC 38', fecha: '2026-09-14' },
    { nombre: 'CASIANO CABRERA JAYNI PAMELA', dni: '70135405', lic: 'LIC 41', fecha: '2026-09-14' },
    { nombre: 'GUARNIZ MARREROS NELIXA VIVIANA', dni: '63249902', lic: 'LIC 44', fecha: '2026-09-14' },
    { nombre: 'PINGO CASTILLO LIZEL YVET', dni: '47540370', lic: 'LIC 45', fecha: '2026-09-14' },
    { nombre: 'PAREDES GALARRETA CRISTHIAN JEANPIER', dni: '60741145', lic: 'LIC 55', fecha: '2026-09-14' },
    { nombre: 'DIAZ VARAS FANNY DEL MILAGRO', dni: '43558894', lic: 'LIC 57', fecha: '2026-09-14' },
    { nombre: 'LUCANO MALCA MOISES', dni: '76261283', lic: 'LIC 58', fecha: '2026-09-14' },
    { nombre: 'FUENTES VALIENTE DEIMAR ULISES', dni: '74942842', lic: 'LIC 60', fecha: '2026-09-14' },

    /* —— 2026-09-16 (17 asignaciones · padrón del día) —— */
    { nombre: 'PLASENCIA CORREA NADIA YVONNE', dni: '43583858', lic: 'LIC 02', fecha: '2026-09-16' },
    { nombre: 'LLAQUE ARGOMEDO GENESIS GUILIANA KEIKO', dni: '70559269', lic: 'LIC 05', fecha: '2026-09-16' },
    { nombre: 'CHACON BERMUDEZ NADIA SARAHI', dni: '77146080', lic: 'LIC 06', fecha: '2026-09-16' },
    { nombre: 'RODRIGUEZ CABRERA KENYI JENNY', dni: '70507014', lic: 'LIC 07', fecha: '2026-09-16' },
    { nombre: 'PEÑA ROJAS LAURA PATRICIA', dni: '45372928', lic: 'LIC 11', fecha: '2026-09-16' },
    { nombre: 'JULCA GAMBOA DILMER ELICER', dni: '48533707', lic: 'LIC 15', fecha: '2026-09-16' },
    { nombre: 'HILARIO AVALOS EVELYN', dni: '48446147', lic: 'LIC 17', fecha: '2026-09-16' },
    { nombre: 'LEON TRIGOSO JHONY ANDRONICO', dni: '71806261', lic: 'LIC 18', fecha: '2026-09-16' },
    { nombre: 'PURIZAGA SAAVEDRA PIERRE OSNAR', dni: '70192702', lic: 'LIC 24', fecha: '2026-09-16' },
    { nombre: 'HERRERA ALBERCA PAMELA', dni: '77534125', lic: 'LIC 25', fecha: '2026-09-16' },
    { nombre: 'ROJAS AREDO YERSI YEN', dni: '75141739', lic: 'LIC 27', fecha: '2026-09-16' },
    { nombre: 'NORIEGA PONTE MICELY', dni: '48268173', lic: 'LIC 34', fecha: '2026-09-16' },
    { nombre: 'TRONCOSO SANCHEZ HENRY BRAULIO', dni: '73634792', lic: 'LIC 35', fecha: '2026-09-16' },
    { nombre: 'VILCA BRICEÑO ALEXANDRA MARIA LAURA', dni: '76986313', lic: 'LIC 38', fecha: '2026-09-16' },
    { nombre: 'CASIANO CABRERA JAYNI PAMELA', dni: '70135405', lic: 'LIC 41', fecha: '2026-09-16' },
    { nombre: 'GUARNIZ MARREROS NELIXA VIVIANA', dni: '63249902', lic: 'LIC 44', fecha: '2026-09-16' },
    { nombre: 'PAREDES GALARRETA CRISTHIAN JEANPIER', dni: '60741145', lic: 'LIC 52', fecha: '2026-09-16' },

    /* —— Bajas / sin LIC (historial · no lookup) —— */
    { nombre: 'VASQUEZ DELGADO ROBERTO CARLOS', dni: '42493820', lic: '', fecha: '2026-08-27', activo: false, nota: 'baja' },
    { nombre: 'VASQUEZ URBINA EDIN CLAY', dni: '44141396', lic: '', fecha: '2026-08-27', activo: false, nota: 'baja' },
    { nombre: 'OLIVARES AGUILAR ELCIRA', dni: '48590607', lic: '', fecha: '2026-08-27', activo: false, nota: 'baja' },
    { nombre: 'LARA GUARNIZ LUIS MARIO', dni: '61014348', lic: '', fecha: '2026-08-27', activo: false, nota: 'baja' },
    { nombre: 'ANTICONA SOTO CRISTHIAN ALEXANDER', dni: '71405307', lic: '', fecha: '2026-08-27', activo: false, nota: 'baja' },
    { nombre: 'DE LA CRUZ SAAVEDRA JHONATAN JOEL', dni: '73503134', lic: '', fecha: '2026-08-27', activo: false, nota: 'baja' },
    { nombre: 'PADILLA NUÑEZ JESUS MARIA', dni: '74239909', lic: '', fecha: '2026-08-27', activo: false, nota: 'baja' },
    { nombre: 'BAZAN ÑIQUIN JOSE GABRIEL', dni: '74984893', lic: '', fecha: '2026-08-27', activo: false, nota: 'baja' },
    { nombre: 'TERRONES SORIA ESMERALDA BLANCA GETSABET', dni: '77914317', lic: '', fecha: '2026-08-27', activo: false, nota: 'baja' },
    { nombre: 'SALVADOR FLOREANO LUZ DEL ROCIO', dni: '75501379', lic: '', fecha: '2026-08-27', activo: false, nota: 'calidad' }
  ],

  /**
   * Supervisores generales · cada uno agrupa supervisores de LIC (por DNI).
   * @type {{nombre:string,dni:string,supervisores:string[]}[]}
   */
  generales: [
    {
      nombre: 'PONCE RUIZ ISIDRO',
      dni: '42992833',
      supervisores: [
        '77534125',
        '70559269',
        '63249902',
        '43558894',
        '47117035',
        '43583858',
        '74942842'
      ]
    },
    {
      nombre: 'RODRIGUEZ GUTIERREZ SANTOS RUBEN',
      dni: '19085520',
      supervisores: [
        '71405307',
        '60467254',
        '71880419',
        '48268173',
        '73634792',
        '60836174',
        '75141739',
        '70135405',
        '70657242',
        '71806261'
      ]
    },
    {
      nombre: 'HUAMAN CASTRO ARNOLD HENRY',
      dni: '70749513',
      supervisores: [
        '77146080',
        '45372928',
        '70507014',
        '74291763',
        '48446147',
        '48533707',
        '76261283',
        '77160560'
      ]
    },
    {
      nombre: 'VARGAS DIAZ ALDRIN',
      dni: '70656198',
      supervisores: [
        '76774075',
        '60741145',
        '76986313',
        '61512235',
        '70875214',
        '70192702',
        '45206311',
        '74959924'
      ]
    }
  ],

  _byLicByFecha: null,
  _fechasOrd: null,
  _generalBySupDni: null,

  normDni(dni) {
    const d = String(dni == null ? '' : dni).replace(/\D/g, '');
    if (!d) return '';
    if (d.length < 8) return d.padStart(8, '0');
    return d.slice(0, 9);
  },

  licKey(grupo) {
    const s = String(grupo || '').trim();
    const m = s.match(/LIC\s*0*(\d{1,2})/i);
    if (m) return 'LIC ' + String(m[1]).padStart(2, '0');
    return s.toUpperCase();
  },

  isActive(r) {
    return !r || r.activo !== false;
  },

  activeRows() {
    return this.rows.filter((r) => this.isActive(r));
  },

  /** DNIs de supervisores LIC + generales (no deben contar como cosechadores) */
  supervisorDniSet() {
    if (this._supervisorDniSet) return this._supervisorDniSet;
    const set = new Set();
    (this.rows || []).forEach((r) => {
      const d = this.normDni(r && r.dni);
      if (d) set.add(d);
    });
    (this.generales || []).forEach((g) => {
      const d = this.normDni(g && g.dni);
      if (d) set.add(d);
      (g.supervisores || []).forEach((sd) => {
        const x = this.normDni(sd);
        if (x) set.add(x);
      });
    });
    this._supervisorDniSet = set;
    return set;
  },

  isSupervisorDni(dni) {
    const d = this.normDni(dni);
    if (!d) return false;
    return this.supervisorDniSet().has(d);
  },

  /** Extrae YYYY-MM-DD de ISO o de DD/MM/YYYY (planilla). */
  toIso(fecha) {
    const s = String(fecha || '').trim();
    if (!s) return '';
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + '-' + m[2] + '-' + m[3];
    m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
    if (m) {
      return m[3] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
    }
    return '';
  },

  _resolveFecha(fecha) {
    const raw = String(fecha || '').trim();
    if (window.QB && typeof QB.appFechaIso === 'function') {
      const iso = String(QB.appFechaIso(raw) || '').trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    }
    const fromRaw = this.toIso(raw);
    if (fromRaw) return fromRaw;
    if (raw) return '';
    if (window.QB && typeof QB.appFecha === 'function') {
      const f = String(QB.appFecha() || '').trim();
      if (window.QB && typeof QB.appFechaIso === 'function') {
        const iso = String(QB.appFechaIso(f) || '').trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
      }
      return this.toIso(f);
    }
    return '';
  },

  rebuild() {
    const map = {};
    const fechas = new Set();
    this.rows.forEach((r) => {
      if (!this.isActive(r)) return;
      const fecha = this.toIso(r.fecha) || String(r.fecha || '').trim();
      const key = this.licKey(r.lic);
      if (!fecha || !key || /NO TENGO/i.test(r.lic)) return;
      const dni = this.normDni(r.dni);
      r.dni = dni;
      if (!map[fecha]) map[fecha] = {};
      map[fecha][key] = {
        nombre: r.nombre,
        dni,
        lic: key,
        fecha
      };
      fechas.add(fecha);
    });
    this._byLicByFecha = map;
    this._fechasOrd = [...fechas].sort((a, b) => b.localeCompare(a));
    this.rebuildGenerales();
    return map;
  },

  rebuildGenerales() {
    const map = {};
    (this.generales || []).forEach((g) => {
      const info = {
        nombre: String(g.nombre || '').trim(),
        dni: this.normDni(g.dni)
      };
      (g.supervisores || []).forEach((dni) => {
        const key = this.normDni(dni);
        if (key) map[key] = info;
      });
    });
    this._generalBySupDni = map;
    return map;
  },

  enrichFromWorkers() {
    if (!window.QB || !QB.workers || !QB.workers.ready) return;
    let changed = false;
    this.rows.forEach((r) => {
      if (!this.isActive(r)) return;
      const dni = this.normDni(r.dni);
      const hit = dni ? QB.workers.get(dni) : null;
      if (!hit || !hit.dni) return;
      const next = this.normDni(hit.dni);
      if (!next || next === r.dni) return;
      const bareA = String(r.dni || '').replace(/^0+/, '') || '0';
      const bareB = next.replace(/^0+/, '') || '0';
      if (!r.dni || bareA === bareB) {
        r.dni = next;
        changed = true;
      }
    });
    if (changed) this.rebuild();
  },

  byLic(grupo, fecha) {
    if (!this._byLicByFecha) this.rebuild();
    const lic = this.licKey(grupo);
    if (!lic) return null;
    const f = this._resolveFecha(fecha);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return null;
    if (this._byLicByFecha[f] && this._byLicByFecha[f][lic]) {
      return this._byLicByFecha[f][lic];
    }
    for (let i = 0; i < (this._fechasOrd || []).length; i++) {
      const fd = this._fechasOrd[i];
      if (fd > f) continue;
      if (this._byLicByFecha[fd] && this._byLicByFecha[fd][lic]) {
        return this._byLicByFecha[fd][lic];
      }
    }
    return null;
  },

  dniNombreLabel(person) {
    if (!person) return '';
    const dni = this.normDni(person.dni);
    const nombre = String(person.nombre || '').trim();
    if (dni && nombre) return dni + ' - ' + nombre;
    return nombre || dni || '';
  },

  generalForSupervisorDni(dni) {
    if (!this._generalBySupDni) this.rebuildGenerales();
    return this._generalBySupDni[this.normDni(dni)] || null;
  },

  generalForLic(grupo, fecha) {
    const s = this.byLic(grupo, fecha);
    return s ? this.generalForSupervisorDni(s.dni) : null;
  },

  licSupervisorLabel(grupo, fecha) {
    const lic = this.licKey(grupo);
    const person = this.dniNombreLabel(this.byLic(grupo, fecha));
    if (lic && person) return lic + ' · ' + person;
    return person || lic || '';
  },

  /** Bloque compacto para cuadro: LIC / DNI / Nombre */
  licSupervisorBlock(grupo, fecha) {
    const lic = this.licKey(grupo);
    const s = this.byLic(grupo, fecha);
    if (!s) return lic || '—';
    const lines = [lic, this.normDni(s.dni), String(s.nombre || '').trim()].filter(Boolean);
    return lines.join('\n');
  },

  generalLabelForLic(grupo, fecha) {
    return this.dniNombreLabel(this.generalForLic(grupo, fecha));
  },

  /** Bloque compacto supervisor general: DNI / Nombre */
  generalSupervisorBlock(grupo, fecha) {
    const g = this.generalForLic(grupo, fecha);
    if (!g) return '—';
    const lines = [g.dni, String(g.nombre || '').trim()].filter(Boolean);
    return lines.join('\n');
  },

  shortName(nombre) {
    const p = String(nombre || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!p.length) return '—';
    if (p.length === 1) return p[0];
    const a = p[0].toUpperCase();
    if (a === 'DE' || a === 'DEL' || a === 'LA' || a === 'LOS' || a === 'LAS') {
      return p.slice(0, Math.min(3, p.length)).join(' ');
    }
    if (p.length >= 3 && p[1].toUpperCase() === 'LA' && a === 'DE') {
      return p.slice(0, 3).join(' ');
    }
    return p[0] + ' ' + p[1];
  },

  label(grupo, fecha) {
    const s = this.byLic(grupo, fecha);
    return s ? this.shortName(s.nombre) : '';
  },

  fullLabel(grupo, fecha) {
    const s = this.byLic(grupo, fecha);
    return s ? s.nombre : '';
  },

  /** LICs del padrón para una fecha (lista ordenada). */
  licsForFecha(fecha) {
    if (!this._byLicByFecha) this.rebuild();
    const f = this._resolveFecha(fecha);
    const bucket = (f && this._byLicByFecha[f]) || {};
    return Object.keys(bucket).sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const nb = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return na - nb;
    });
  }
};

QB.supervisors.rebuild();
QB.supervisors.rebuildGenerales();
