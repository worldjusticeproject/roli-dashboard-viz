const ACTIVE_YEAR = '2025';

const REGION_OPTIONS = [
  { value: 'global',                          label: 'Global' },
  { value: 'East Asia and Pacific',           label: 'East Asia and Pacific' },
  { value: 'Eastern Europe and Central Asia', label: 'Eastern Europe and Central Asia' },
  { value: 'EU, EFTA, and North America',     label: 'EU, EFTA, and North America' },
  { value: 'European Union',                  label: 'European Union' },
  { value: 'EU enlargement',                  label: 'EU Enlargement' },
  { value: 'Latin America and Caribbean',     label: 'Latin America and Caribbean' },
  { value: 'Middle East and North Africa',    label: 'Middle East and North Africa' },
  { value: 'South Asia',                      label: 'South Asia' },
  { value: 'Sub-Saharan Africa',              label: 'Sub-Saharan Africa' },
];

// EU27 member states
const EU_COUNTRIES = [
  'Austria',
  'Belgium',
  'Bulgaria',
  'Croatia',
  'Cyprus',
  'Czechia',
  'Denmark',
  'Estonia',
  'Finland',
  'France',
  'Germany',
  'Greece',
  'Hungary',
  'Ireland',
  'Italy',
  'Latvia',
  'Lithuania',
  'Luxembourg',
  'Malta',
  'Netherlands',
  'Poland',
  'Portugal',
  'Romania',
  'Slovak Republic',
  'Slovenia',
  'Spain',
  'Sweden',
];

// EU enlargement candidate countries
const EU_ENLARGEMENT_COUNTRIES = [
  'Albania',
  'Bosnia and Herzegovina',
  'Georgia',
  'Kosovo',
  'Moldova',
  'Montenegro',
  'North Macedonia',
  'Serbia',
  'Türkiye',
  'Ukraine',
];


const VARIABLE_OPTIONS = [
  { value: 'roli', label: 'WJP Rule of Law Index: Overall Score', category: 'general' },

  { value: 'f1', label: 'Factor 1: Constraints on Government Powers', category: 'factor' },
  { value: 'f2', label: 'Factor 2: Absence of Corruption',            category: 'factor' },
  { value: 'f3', label: 'Factor 3: Open Government',                  category: 'factor' },
  { value: 'f4', label: 'Factor 4: Fundamental Rights',               category: 'factor' },
  { value: 'f5', label: 'Factor 5: Order and Security',               category: 'factor' },
  { value: 'f6', label: 'Factor 6: Regulatory Enforcement',           category: 'factor' },
  { value: 'f7', label: 'Factor 7: Civil Justice',                    category: 'factor' },
  { value: 'f8', label: 'Factor 8: Criminal Justice',                 category: 'factor' },

  { value: 'sf11', label: '1.1 Government powers are effectively limited by the legislature',             category: 'sf1' },
  { value: 'sf12', label: '1.2 Government powers are effectively limited by the judiciary',               category: 'sf1' },
  { value: 'sf13', label: '1.3 Government powers are effectively limited by independent auditing and review', category: 'sf1' },
  { value: 'sf14', label: '1.4 Government officials are sanctioned for misconduct',                       category: 'sf1' },
  { value: 'sf15', label: '1.5 Government powers are subject to non-governmental checks',                 category: 'sf1' },
  { value: 'sf16', label: '1.6 Transition of power is subject to the law',                                category: 'sf1' },

  { value: 'sf21', label: '2.1 Government officials in the executive branch do not use public office for private gain',   category: 'sf2' },
  { value: 'sf22', label: '2.2 Government officials in the judicial branch do not use public office for private gain',    category: 'sf2' },
  { value: 'sf23', label: '2.3 Government officials in the police and the military do not use public office for private gain', category: 'sf2' },
  { value: 'sf24', label: '2.4 Government officials in the legislative branch do not use public office for private gain', category: 'sf2' },

  { value: 'sf31', label: '3.1 Publicized laws and government data',  category: 'sf3' },
  { value: 'sf32', label: '3.2 Right to information',                 category: 'sf3' },
  { value: 'sf33', label: '3.3 Civic participation',                  category: 'sf3' },
  { value: 'sf34', label: '3.4 Complaint mechanisms',                 category: 'sf3' },

  { value: 'sf41', label: '4.1 Equal treatment and absence of discrimination',                            category: 'sf4' },
  { value: 'sf42', label: '4.2 The right to life and security of the person is effectively guaranteed',   category: 'sf4' },
  { value: 'sf43', label: '4.3 Due process of the law and rights of the accused',                         category: 'sf4' },
  { value: 'sf44', label: '4.4 Freedom of opinion and expression is effectively guaranteed',              category: 'sf4' },
  { value: 'sf45', label: '4.5 Freedom of belief and religion is effectively guaranteed',                 category: 'sf4' },
  { value: 'sf46', label: '4.6 Freedom from arbitrary interference with privacy is effectively guaranteed', category: 'sf4' },
  { value: 'sf47', label: '4.7 Freedom of assembly and association is effectively guaranteed',            category: 'sf4' },
  { value: 'sf48', label: '4.8 Fundamental labor rights are effectively guaranteed',                      category: 'sf4' },

  { value: 'sf51', label: '5.1 Crime is effectively controlled',                                          category: 'sf5' },
  { value: 'sf52', label: '5.2 Civil conflict is effectively limited',                                    category: 'sf5' },
  { value: 'sf53', label: '5.3 People do not resort to violence to redress personal grievances',          category: 'sf5' },

  { value: 'sf61', label: '6.1 Government regulations are effectively enforced',                          category: 'sf6' },
  { value: 'sf62', label: '6.2 Government regulations are applied and enforced without improper influence', category: 'sf6' },
  { value: 'sf63', label: '6.3 Administrative proceedings are conducted without unreasonable delay',      category: 'sf6' },
  { value: 'sf64', label: '6.4 Due process is respected in administrative proceedings',                   category: 'sf6' },
  { value: 'sf65', label: '6.5 The government does not expropriate without lawful process and adequate compensation', category: 'sf6' },

  { value: 'sf71', label: '7.1 People can access and afford civil justice',                               category: 'sf7' },
  { value: 'sf72', label: '7.2 Civil justice is free of discrimination',                                  category: 'sf7' },
  { value: 'sf73', label: '7.3 Civil justice is free of corruption',                                      category: 'sf7' },
  { value: 'sf74', label: '7.4 Civil justice is free of improper government influence',                   category: 'sf7' },
  { value: 'sf75', label: '7.5 Civil justice is not subject to unreasonable delay',                       category: 'sf7' },
  { value: 'sf76', label: '7.6 Civil justice is effectively enforced',                                    category: 'sf7' },
  { value: 'sf77', label: '7.7 Alternative dispute resolution mechanisms are accessible, impartial, and effective', category: 'sf7' },

  { value: 'sf81', label: '8.1 Criminal investigation system is effective',                               category: 'sf8' },
  { value: 'sf82', label: '8.2 Criminal adjudication system is timely and effective',                     category: 'sf8' },
  { value: 'sf83', label: '8.3 Correctional system is effective in reducing criminal behavior',           category: 'sf8' },
  { value: 'sf84', label: '8.4 Criminal system is impartial',                                             category: 'sf8' },
  { value: 'sf85', label: '8.5 Criminal system is free of corruption',                                    category: 'sf8' },
  { value: 'sf86', label: '8.6 Criminal system is free of improper government influence',                 category: 'sf8' },
  { value: 'sf87', label: '8.7 Due process of the law and rights of the accused',                         category: 'sf8' },
];

const SUBFACTOR_GROUPS = [
  { label: 'Factor 1: Constraints on Government Powers', category: 'sf1' },
  { label: 'Factor 2: Absence of Corruption',            category: 'sf2' },
  { label: 'Factor 3: Open Government',                  category: 'sf3' },
  { label: 'Factor 4: Fundamental Rights',               category: 'sf4' },
  { label: 'Factor 5: Order and Security',               category: 'sf5' },
  { label: 'Factor 6: Regulatory Enforcement',           category: 'sf6' },
  { label: 'Factor 7: Civil Justice',                    category: 'sf7' },
  { label: 'Factor 8: Criminal Justice',                 category: 'sf8' },
];

const COLORS = {
  // WJP Brand Colors
  primary: '#5C2D91',      // WJP Purple - for titles and primary actions
  secondary: '#181878',    // WJP Navy - for secondary navigation
  // High-contrast pair (WJP guidelines): used for the two series in Top & Bottom
  top5: '#181878',         // Data indigo - primary color inside data viz
  bottom5: '#FF4D6A',      // Paired contrast color
  background: '#FFFFFF',   // Clean white background
  backgroundAlt: '#f8f7f4', // Alternate background for sections
  text: '#1a1a1a',
  muted: '#6b6b6b',
  divider: '#e5e5e5',
  white: '#FFFFFF',
};

const TS_COLORS = {
  line: '#181878',
  axis: '#666666',
  grid: '#BDBDBD',
  regionalAvg: '#757575',
  globalAvg: '#00A8A5'
};

// Factor colors for Country Profile chart.
// WJP categorical palette, applied in its fixed order - the sequence is curated
// to maximize contrast between neighbours and stay legible for color-blind
// viewers, so do not reorder it.
const FACTOR_COLORS = {
  f1: '#181878',  // Constraints on Government Power
  f2: '#BF02AF',  // Absence of Corruption
  f3: '#3366FF',  // Open Government
  f4: '#FF4D6A',  // Fundamental Rights
  f5: '#9C89ED',  // Order and Security
  f6: '#226640',  // Regulatory Enforcement
  f7: '#FFB52B',  // Civil Justice
  f8: '#00A8A5',  // Criminal Justice
};

// Short labels for profile chart (matching WJP style)
const FACTOR_SHORT_LABELS = {
  f1: '1. Constraints on Government Powers',
  f2: '2. Absence of Corruption',
  f3: '3. Open Government',
  f4: '4. Fundamental Rights',
  f5: '5. Order and Security',
  f6: '6. Regulatory Enforcement',
  f7: '7. Civil Justice',
  f8: '8. Criminal Justice',
};

const SUBFACTOR_SHORT_LABELS = {
  sf11: '1.1 Limited by legislature',
  sf12: '1.2 Limited by judiciary',
  sf13: '1.3 Limited by auditing and review',
  sf14: '1.4 Officials sanctioned for misconduct',
  sf15: '1.5 Non-governmental checks',
  sf16: '1.6 Transition of power',
  sf21: '2.1 Executive branch',
  sf22: '2.2 Judicial branch',
  sf23: '2.3 Police and military',
  sf24: '2.4 Legislative branch',
  sf31: '3.1 Publicized laws and government data',
  sf32: '3.2 Right to information',
  sf33: '3.3 Civic participation',
  sf34: '3.4 Complaint mechanisms',
  sf41: '4.1 Equal treatment and absence of discrimination',
  sf42: '4.2 Right to life and security',
  sf43: '4.3 Due process and rights of the accused',
  sf44: '4.4 Freedom of opinion and expression',
  sf45: '4.5 Freedom of belief and religion',
  sf46: '4.6 Freedom from interference with privacy',
  sf47: '4.7 Freedom of assembly and association',
  sf48: '4.8 Fundamental labor rights',
  sf51: '5.1 Crime is effectively controlled',
  sf52: '5.2 Civil conflict is effectively limited',
  sf53: '5.3 No violence to redress grievances',
  sf61: '6.1 Regulations effectively enforced',
  sf62: '6.2 No improper influence',
  sf63: '6.3 No unreasonable delay',
  sf64: '6.4 Due process in administrative proceedings',
  sf65: '6.5 No expropriation without due process',
  sf71: '7.1 Access and afford civil justice',
  sf72: '7.2 Free of discrimination',
  sf73: '7.3 Free of corruption',
  sf74: '7.4 Free of improper government influence',
  sf75: '7.5 No unreasonable delay',
  sf76: '7.6 Effectively enforced',
  sf77: '7.7 Alternative dispute resolution',
  sf81: '8.1 Investigation system is effective',
  sf82: '8.2 Adjudication is timely and effective',
  sf83: '8.3 Correctional system is effective',
  sf84: '8.4 Criminal system is impartial',
  sf85: '8.5 Free of corruption',
  sf86: '8.6 Free of improper government influence',
  sf87: '8.7 Due process and rights of the accused',
};

export { ACTIVE_YEAR, REGION_OPTIONS, VARIABLE_OPTIONS, SUBFACTOR_GROUPS, COLORS, TS_COLORS, FACTOR_COLORS, FACTOR_SHORT_LABELS, SUBFACTOR_SHORT_LABELS, EU_COUNTRIES, EU_ENLARGEMENT_COUNTRIES };
