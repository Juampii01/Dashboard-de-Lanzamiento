/**
 * Fuente única de los portales de oportunidades (Día 3 "Tu sorpresa" + Día 4 "premio").
 * El orden de las categorías es: local → estatal → federal, y los grants igual
 * (estatales/locales antes que federales). Render: <PortalsAccordion />.
 */

export type PortalCategory =
  | "ecosistema"
  | "federal"
  | "estatal"
  | "local"
  | "grants_federal"
  | "grants_estatal"
  | "privado";

export interface Portal {
  name: string;
  url: string;
  description?: string;
  category: PortalCategory;
  prereq?: string;
}

export const PORTALS: Portal[] = [
  // ── Ecosistema GovBidder ──
  { name: "GovBidder Academy", url: "https://govbidderacademy.com/login", description: "Formación y cursos de GovBidder para seguir aprendiendo.", category: "ecosistema" },
  { name: "GovBidder App", url: "https://app.govbidder.net/", description: "La plataforma principal de GovBidder para gestionar tu camino al contrato.", category: "ecosistema" },
  { name: "GovBidder AI", url: "https://govbidder.ai/", description: "Herramientas de IA de GovBidder para acelerar tu búsqueda y tus propuestas.", category: "ecosistema" },
  { name: "GovBidder Connect", url: "https://www.govbidderconnect.com/", description: "Conecta con el ecosistema y la comunidad GovBidder.", category: "ecosistema" },

  // ── Gobierno Federal ──
  { name: "SAM.gov", url: "https://sam.gov", description: "Registro federal obligatorio. Tu UEI y CAGE Code salen de acá.", category: "federal", prereq: "EIN / Tax ID + datos bancarios (ACH)" },
  { name: "GSA eBuy", url: "https://www.ebuy.gsa.gov", description: "RFQs de agencias buscando proveedores. Alto volumen de servicios.", category: "federal", prereq: "Registro en SAM.gov" },
  { name: "GSA Advantage", url: "https://gsaadvantage.gov", description: "Catálogo de compras pre-aprobadas del gobierno.", category: "federal" },
  { name: "SBA.gov", url: "https://sba.gov", description: "Certificaciones (8a, WOSB, HUBZone) y recursos para small business.", category: "federal" },
  { name: "SBA Dynamic Small Business Search", url: "https://dsbs.sba.gov/search/dsp_dsbs.cfm", description: "Directorio donde los Contracting Officers buscan small businesses.", category: "federal" },
  { name: "FPDS.gov", url: "https://www.fpds.gov", description: "Datos históricos de adjudicaciones federales — quién ganó qué.", category: "federal" },
  { name: "GSA Forecast of Contracting Opportunities", url: "https://www.acquisition.gov/gsa-forecast", description: "Oportunidades de contratación próximas, por agencia.", category: "federal" },
  { name: "USASpending.gov", url: "https://usaspending.gov", description: "Investiga quién gana contratos en tu NAICS y por cuánto.", category: "federal" },

  // ── Grants Federales ──
  { name: "Grants.gov", url: "https://www.grants.gov", description: "Portal principal de grants del Gobierno Federal.", category: "grants_federal" },
  { name: "SAM.gov — Assistance Listings", url: "https://sam.gov/content/assistance-listings", description: "Catálogo de programas federales de asistencia.", category: "grants_federal" },
  { name: "USDA Rural Development Grants", url: "https://www.rd.usda.gov/programs-services/all-programs", category: "grants_federal" },
  { name: "HUD Exchange — Funding Opportunities", url: "https://www.hudexchange.info/programs", category: "grants_federal" },
  { name: "NIH — Grants & Funding", url: "https://grants.nih.gov", category: "grants_federal" },
  { name: "NSF — Funding Opportunities", url: "https://new.nsf.gov/funding", category: "grants_federal" },
  { name: "DOE — Funding Opportunities", url: "https://www.energy.gov/eere/funding", category: "grants_federal" },
  { name: "Department of Education — Grants", url: "https://www.ed.gov/grants-and-programs", category: "grants_federal" },
  { name: "EPA — Grants", url: "https://www.epa.gov/grants", category: "grants_federal" },
  { name: "EDA — Funding Opportunities", url: "https://www.eda.gov/funding", category: "grants_federal" },

  // ── Grants Estatales y Locales ──
  { name: "Florida Grants System", url: "https://www.floridajobs.org/community-planning-and-development", category: "grants_estatal" },
  { name: "New Jersey — Dept. of Treasury Grants", url: "https://www.nj.gov/treasury/grants", category: "grants_estatal" },
  { name: "New York State Grants Management", url: "https://grantsmanagement.ny.gov", category: "grants_estatal" },
  { name: "Pennsylvania eGrants", url: "https://www.esa.dced.state.pa.us", category: "grants_estatal" },
  { name: "California State Library Grants", url: "https://www.grants.ca.gov", category: "grants_estatal" },
  { name: "Texas eGrants", url: "https://egrants.gov.texas.gov", category: "grants_estatal" },
  { name: "Massachusetts — Commonwealth Grants", url: "https://www.mass.gov/grants", category: "grants_estatal" },
  { name: "Virginia — DHCD Grants", url: "https://www.dhcd.virginia.gov", category: "grants_estatal" },
  { name: "Georgia — Governor's Office (OPB) Grants", url: "https://opb.georgia.gov/grants", category: "grants_estatal" },
  { name: "Maryland Governor's Grants Office", url: "https://grants.maryland.gov", category: "grants_estatal" },

  // ── Estatales ──
  { name: "Florida — MyFloridaMarketPlace (MFMP)", url: "https://vendor.myfloridamarketplace.com", category: "estatal" },
  { name: "New Jersey — NJSTART", url: "https://www.njstart.gov", category: "estatal" },
  { name: "New York — NYS Contract Reporter", url: "https://www.nyscr.ny.gov", category: "estatal" },
  { name: "Pennsylvania — DGS eMarketplace", url: "https://www.dgs.pa.gov/Materials-Services-Procurement", category: "estatal" },
  { name: "California — Cal eProcure", url: "https://caleprocure.ca.gov", category: "estatal" },
  { name: "Texas — Texas SmartBuy", url: "https://www.txsmartbuy.gov", category: "estatal" },
  { name: "Georgia — Georgia Procurement Registry", url: "https://ssl.doas.state.ga.us/PRSapp", category: "estatal" },
  { name: "Virginia — eVA", url: "https://eva.virginia.gov", category: "estatal" },
  { name: "Massachusetts — COMMBUYS", url: "https://www.commbuys.com", category: "estatal" },

  // ── Locales ──
  { name: "Essex County, New Jersey", url: "https://www.essexcountynjprocure.org", category: "local" },
  { name: "Cook County, Illinois", url: "https://cookcountyil.ionwave.net", category: "local" },
  { name: "Los Angeles County, California", url: "https://camisvr.co.la.ca.us", category: "local" },
  { name: "Maricopa County, Arizona", url: "https://www.maricopa.gov/370/Procurement", category: "local" },
  { name: "Harris County, Texas", url: "https://purchasing.harriscountytx.gov", category: "local" },
  { name: "King County, Washington", url: "https://kingcounty.gov/procurement", category: "local" },
  { name: "Montgomery County, Maryland", url: "https://www.montgomerycountymd.gov/procurement", category: "local" },
  { name: "Fairfax County, Virginia", url: "https://www.fairfaxcounty.gov/procurement", category: "local" },
  { name: "Clark County, Nevada", url: "https://www.clarkcountynv.gov/business/doing_business_with_clark_county", category: "local" },
  { name: "City of Philadelphia, Pennsylvania", url: "https://www.phila.gov/departments/procurement-department/", category: "local" },

  // ── Plataformas privadas de licitaciones ──
  { name: "OpenGov Procurement", url: "https://procurement.opengov.com", category: "privado" },
  { name: "Bonfire (Euna Supplier Network)", url: "https://supplier.eunasolutions.com", category: "privado" },
  { name: "BidNet Direct", url: "https://www.bidnetdirect.com", category: "privado" },
  { name: "PlanetBids", url: "https://home.planetbids.com", category: "privado" },
  { name: "Ion Wave Technologies (IWT)", url: "https://www.ionwave.net", category: "privado" },
  { name: "DemandStar", url: "https://network.demandstar.com", category: "privado" },
  { name: "Periscope S2G (Periscope Holdings)", url: "https://www.periscopeholdings.com", category: "privado" },
  { name: "Public Purchase", url: "https://www.publicpurchase.com", category: "privado" },
  { name: "GovWin IQ", url: "https://www.deltek.com/en/products/govwin", category: "privado" },
];

export const CATEGORY_ORDER: { key: PortalCategory; label: string }[] = [
  { key: "ecosistema", label: "🦅 Ecosistema GovBidder" },
  { key: "local", label: "🏙️ Gobierno Local" },
  { key: "estatal", label: "🏛️ Gobierno Estatal" },
  { key: "federal", label: "🇺🇸 Gobierno Federal" },
  { key: "grants_estatal", label: "💰 Grants Estatales y Locales" },
  { key: "grants_federal", label: "💰 Grants Federales" },
  { key: "privado", label: "🏢 Plataformas privadas" },
];
