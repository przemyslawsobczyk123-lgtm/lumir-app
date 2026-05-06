import type { Metadata } from "next";
import { LegalPage } from "../legal-page";

export const metadata: Metadata = {
  title: "Regulamin - LuMir",
  description: "Regulamin korzystania z aplikacji LuMir.",
};

const sections = [
  {
    title: "Postanowienia ogolne",
    body: [
      "LuMir jest aplikacja SaaS wspierajaca sprzedawcow marketplace w przygotowaniu danych produktowych, opisow, atrybutow, importow i eksportow.",
      "Korzystanie z uslugi wymaga konta uzytkownika. Uzytkownik odpowiada za prawdziwosc danych wprowadzonych do systemu oraz za zgodnosc ofert z regulaminami marketplace.",
    ],
  },
  {
    title: "Konto i bezpieczenstwo",
    body: [
      "Uzytkownik powinien chronic dane logowania i nie udostepniac konta osobom nieuprawnionym.",
      "Operator moze zablokowac konto, jezeli wykryje naduzycia, probe obejscia limitow, naruszenie bezpieczenstwa albo dzialanie sprzeczne z prawem.",
    ],
  },
  {
    title: "AI i dane produktowe",
    body: [
      "Wyniki AI sa wsparciem operacyjnym i wymagaja sprawdzenia przez uzytkownika przed publikacja oferty.",
      "Uzytkownik odpowiada za finalna tresc oferty, ceny, stany magazynowe, zgodnosc z prawem, prawami osob trzecich i wymogami marketplace.",
    ],
  },
  {
    title: "Integracje marketplace",
    body: [
      "Uzytkownik moze polaczyc zewnetrzne konta i przekazywac dane do integracji takich jak Allegro, Amazon, Icecat lub inne dostepne moduly.",
      "Operator nie gwarantuje stalej dostepnosci zewnetrznych API. Awaria lub zmiana po stronie dostawcy zewnetrznego moze ograniczyc dzialanie czesci funkcji.",
    ],
  },
  {
    title: "Platnosci i kredyty",
    body: [
      "Platnosci za pakiety kredytow obsluguje Stripe. Kredyty sa doliczane po potwierdzeniu platnosci przez system platniczy.",
      "Kredyty sluza do rozliczania wybranych operacji AI i innych funkcji platnych. Szczegoly pakietow sa widoczne w panelu billingowym.",
    ],
  },
  {
    title: "Dostepnosc i przerwy techniczne",
    body: [
      "Operator doklada starannosci, aby usluga byla dostepna stabilnie, ale moze prowadzic prace techniczne, aktualizacje i naprawy.",
      "W razie awarii operator moze ograniczyc dostep do wybranych funkcji, aby chronic dane i stabilnosc systemu.",
    ],
  },
  {
    title: "Odpowiedzialnosc",
    body: [
      "LuMir nie zastepuje kontroli sprzedawcy. Uzytkownik powinien sprawdzic kazda oferte przed publikacja.",
      "Operator nie odpowiada za decyzje marketplace, odrzucenie oferty, blokade konta marketplace, bledne dane zrodlowe ani straty wynikajace z publikacji niesprawdzonych tresci.",
    ],
  },
  {
    title: "Kontakt i zmiany regulaminu",
    body: [
      "Kontakt operacyjny: kontakt@lumirai.pl.",
      "Regulamin moze byc aktualizowany. Istotne zmiany beda komunikowane w aplikacji lub mailowo, jezeli wymaga tego charakter zmiany.",
    ],
  },
];

export default function LuMirTermsPage() {
  return (
    <LegalPage
      title="Regulamin"
      subtitle="Zasady korzystania z aplikacji LuMir i odpowiedzialnosc za prace na danych produktowych."
      updatedAt="2026-05-05"
      sections={sections}
    />
  );
}

export { sections as regulaminSections };
