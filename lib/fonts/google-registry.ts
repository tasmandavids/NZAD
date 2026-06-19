import { Albert_Sans, Archivo, Bebas_Neue, Bodoni_Moda, Bricolage_Grotesque, Cinzel, Cormorant_Garamond, Crimson_Pro, DM_Sans, DM_Serif_Display, EB_Garamond, Figtree, Fraunces, Hanken_Grotesk, Instrument_Sans, Instrument_Serif, Inter, Josefin_Sans, Karla, Lato, Lexend, Libre_Baskerville, Libre_Franklin, Lora, Manrope, Merriweather, Montserrat, Nunito, Nunito_Sans, Open_Sans, Oswald, Outfit, Playfair_Display, Plus_Jakarta_Sans, Poppins, Quicksand, Raleway, Roboto, Rubik, Sora, Source_Sans_3, Space_Grotesk, Syne, Urbanist, Work_Sans } from "next/font/google";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-fraunces", display: "swap", preload: false, adjustFontFallback: true });
const hankenGrotesk = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-hanken-grotesk", display: "swap", preload: false, adjustFontFallback: true });
const cormorantGaramond = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-cormorant-garamond", display: "swap", preload: false, adjustFontFallback: true });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter", display: "swap", preload: false, adjustFontFallback: true });
const playfairDisplay = Playfair_Display({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-playfair-display", display: "swap", preload: false, adjustFontFallback: true });
const sourceSans3 = Source_Sans_3({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-source-sans-3", display: "swap", preload: false, adjustFontFallback: true });
const libreBaskerville = Libre_Baskerville({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-libre-baskerville", display: "swap", preload: false, adjustFontFallback: true });
const lato = Lato({ subsets: ["latin"], weight: ["400", "700", "900"], variable: "--font-lato", display: "swap", preload: false, adjustFontFallback: true });
const merriweather = Merriweather({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-merriweather", display: "swap", preload: false, adjustFontFallback: true });
const openSans = Open_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-open-sans", display: "swap", preload: false, adjustFontFallback: true });
const lora = Lora({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-lora", display: "swap", preload: false, adjustFontFallback: true });
const nunitoSans = Nunito_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-nunito-sans", display: "swap", preload: false, adjustFontFallback: true });
const dMSerifDisplay = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: "--font-dm-serif-display", display: "swap", preload: false, adjustFontFallback: true });
const dMSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-dm-sans", display: "swap", preload: false, adjustFontFallback: true });
const cinzel = Cinzel({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-cinzel", display: "swap", preload: false, adjustFontFallback: true });
const raleway = Raleway({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-raleway", display: "swap", preload: false, adjustFontFallback: true });
const bodoniModa = Bodoni_Moda({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-bodoni-moda", display: "swap", preload: false, adjustFontFallback: true });
const workSans = Work_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-work-sans", display: "swap", preload: false, adjustFontFallback: true });
const oswald = Oswald({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-oswald", display: "swap", preload: false, adjustFontFallback: true });
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-roboto", display: "swap", preload: false, adjustFontFallback: true });
const bebasNeue = Bebas_Neue({ subsets: ["latin"], weight: ["400"], variable: "--font-bebas-neue", display: "swap", preload: false, adjustFontFallback: true });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-montserrat", display: "swap", preload: false, adjustFontFallback: true });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-space-grotesk", display: "swap", preload: false, adjustFontFallback: true });
const archivo = Archivo({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-archivo", display: "swap", preload: false, adjustFontFallback: true });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins", display: "swap", preload: false, adjustFontFallback: true });
const nunito = Nunito({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-nunito", display: "swap", preload: false, adjustFontFallback: true });
const lexend = Lexend({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-lexend", display: "swap", preload: false, adjustFontFallback: true });
const rubik = Rubik({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-rubik", display: "swap", preload: false, adjustFontFallback: true });
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-manrope", display: "swap", preload: false, adjustFontFallback: true });
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plus-jakarta-sans", display: "swap", preload: false, adjustFontFallback: true });
const eBGaramond = EB_Garamond({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-eb-garamond", display: "swap", preload: false, adjustFontFallback: true });
const karla = Karla({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-karla", display: "swap", preload: false, adjustFontFallback: true });
const crimsonPro = Crimson_Pro({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-crimson-pro", display: "swap", preload: false, adjustFontFallback: true });
const libreFranklin = Libre_Franklin({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-libre-franklin", display: "swap", preload: false, adjustFontFallback: true });
const josefinSans = Josefin_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-josefin-sans", display: "swap", preload: false, adjustFontFallback: true });
const albertSans = Albert_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-albert-sans", display: "swap", preload: false, adjustFontFallback: true });
const quicksand = Quicksand({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-quicksand", display: "swap", preload: false, adjustFontFallback: true });
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-figtree", display: "swap", preload: false, adjustFontFallback: true });
const urbanist = Urbanist({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-urbanist", display: "swap", preload: false, adjustFontFallback: true });
const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-instrument-serif", display: "swap", preload: false, adjustFontFallback: true });
const instrumentSans = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-instrument-sans", display: "swap", preload: false, adjustFontFallback: true });
const bricolageGrotesque = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-bricolage-grotesque", display: "swap", preload: false, adjustFontFallback: true });
const syne = Syne({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-syne", display: "swap", preload: false, adjustFontFallback: true });
const sora = Sora({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sora", display: "swap", preload: false, adjustFontFallback: true });
const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-outfit", display: "swap", preload: false, adjustFontFallback: true });

type FontEntry = { className: string; cssVar: string };

const REGISTRY: Record<string, FontEntry> = {
  "Fraunces": { className: fraunces.variable, cssVar: "--font-fraunces" },
  "Hanken Grotesk": { className: hankenGrotesk.variable, cssVar: "--font-hanken-grotesk" },
  "Cormorant Garamond": { className: cormorantGaramond.variable, cssVar: "--font-cormorant-garamond" },
  "Inter": { className: inter.variable, cssVar: "--font-inter" },
  "Playfair Display": { className: playfairDisplay.variable, cssVar: "--font-playfair-display" },
  "Source Sans 3": { className: sourceSans3.variable, cssVar: "--font-source-sans-3" },
  "Libre Baskerville": { className: libreBaskerville.variable, cssVar: "--font-libre-baskerville" },
  "Lato": { className: lato.variable, cssVar: "--font-lato" },
  "Merriweather": { className: merriweather.variable, cssVar: "--font-merriweather" },
  "Open Sans": { className: openSans.variable, cssVar: "--font-open-sans" },
  "Lora": { className: lora.variable, cssVar: "--font-lora" },
  "Nunito Sans": { className: nunitoSans.variable, cssVar: "--font-nunito-sans" },
  "DM Serif Display": { className: dMSerifDisplay.variable, cssVar: "--font-dm-serif-display" },
  "DM Sans": { className: dMSans.variable, cssVar: "--font-dm-sans" },
  "Cinzel": { className: cinzel.variable, cssVar: "--font-cinzel" },
  "Raleway": { className: raleway.variable, cssVar: "--font-raleway" },
  "Bodoni Moda": { className: bodoniModa.variable, cssVar: "--font-bodoni-moda" },
  "Work Sans": { className: workSans.variable, cssVar: "--font-work-sans" },
  "Oswald": { className: oswald.variable, cssVar: "--font-oswald" },
  "Roboto": { className: roboto.variable, cssVar: "--font-roboto" },
  "Bebas Neue": { className: bebasNeue.variable, cssVar: "--font-bebas-neue" },
  "Montserrat": { className: montserrat.variable, cssVar: "--font-montserrat" },
  "Space Grotesk": { className: spaceGrotesk.variable, cssVar: "--font-space-grotesk" },
  "Archivo": { className: archivo.variable, cssVar: "--font-archivo" },
  "Poppins": { className: poppins.variable, cssVar: "--font-poppins" },
  "Nunito": { className: nunito.variable, cssVar: "--font-nunito" },
  "Lexend": { className: lexend.variable, cssVar: "--font-lexend" },
  "Rubik": { className: rubik.variable, cssVar: "--font-rubik" },
  "Manrope": { className: manrope.variable, cssVar: "--font-manrope" },
  "Plus Jakarta Sans": { className: plusJakartaSans.variable, cssVar: "--font-plus-jakarta-sans" },
  "EB Garamond": { className: eBGaramond.variable, cssVar: "--font-eb-garamond" },
  "Karla": { className: karla.variable, cssVar: "--font-karla" },
  "Crimson Pro": { className: crimsonPro.variable, cssVar: "--font-crimson-pro" },
  "Libre Franklin": { className: libreFranklin.variable, cssVar: "--font-libre-franklin" },
  "Josefin Sans": { className: josefinSans.variable, cssVar: "--font-josefin-sans" },
  "Albert Sans": { className: albertSans.variable, cssVar: "--font-albert-sans" },
  "Quicksand": { className: quicksand.variable, cssVar: "--font-quicksand" },
  "Figtree": { className: figtree.variable, cssVar: "--font-figtree" },
  "Urbanist": { className: urbanist.variable, cssVar: "--font-urbanist" },
  "Instrument Serif": { className: instrumentSerif.variable, cssVar: "--font-instrument-serif" },
  "Instrument Sans": { className: instrumentSans.variable, cssVar: "--font-instrument-sans" },
  "Bricolage Grotesque": { className: bricolageGrotesque.variable, cssVar: "--font-bricolage-grotesque" },
  "Syne": { className: syne.variable, cssVar: "--font-syne" },
  "Sora": { className: sora.variable, cssVar: "--font-sora" },
  "Outfit": { className: outfit.variable, cssVar: "--font-outfit" },
};

const DEFAULT_DISPLAY = REGISTRY["Fraunces"]!;
const DEFAULT_BODY = REGISTRY["Hanken Grotesk"]!;

export function fontsForBranding(display: string, body: string) {
  const d = REGISTRY[display.trim()] ?? DEFAULT_DISPLAY;
  const b = REGISTRY[body.trim()] ?? DEFAULT_BODY;
  const classes = d.className === b.className ? d.className : `${d.className} ${b.className}`;
  return {
    className: classes,
    fontDisplay: `var(${d.cssVar}), system-ui, sans-serif`,
    fontBody: `var(${b.cssVar}), system-ui, sans-serif`,
  };
}

