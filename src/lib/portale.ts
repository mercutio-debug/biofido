/**
 * Identità del portale corrente. ECO-VISA e BioFido condividono la logica della
 * scheda di iscrizione (automatismi e verifiche), ma differenziano l'interfaccia:
 *  - BioFido è RISERVATO alle aziende biologiche certificate (bio obbligatorio);
 *  - ECO-VISA accetta sia aziende convenzionali sia biologiche, e a chi è bio
 *    propone l'iscrizione anche a BioFido.
 */
export type Portale = "ecovisa" | "biofido";
export const PORTALE: Portale = "biofido";
export const NOME_PORTALE = "BioFido";

/** Su BioFido l'azienda DEVE essere biologica certificata. */
export const SOLO_BIO = true;

/** URL dell'altro portale (per le proposte di iscrizione incrociata). */
export const URL_ECOVISA = "https://ecovisa.it";
export const URL_BIOFIDO = "https://biofido.it/";
