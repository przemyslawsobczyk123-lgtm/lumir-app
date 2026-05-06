import type { Metadata } from "next";
import { LegalPage } from "../legal-page";

export const metadata: Metadata = {
  title: "Polityka prywatnosci - LuMir",
  description: "Polityka prywatnosci i informacje RODO dla uzytkownikow LuMir.",
};

export default function LuMirPrivacyPage() {
  return (
    <LegalPage
      title="Polityka prywatnosci"
      subtitle="Jak LuMir przetwarza dane kont, platnosci, produktow i integracji marketplace."
      updatedAt="2026-05-05"
      sections={[
        {
          title: "Administrator i kontakt",
          body: [
            "Administratorem danych jest operator serwisu LuMir. Kontakt operacyjny: kontakt@lumirai.pl.",
            "W sprawach danych osobowych mozesz napisac na kontakt@lumirai.pl. Odpowiadamy na zgloszenia dotyczace dostepu, sprostowania, usuniecia, ograniczenia, sprzeciwu i przenoszenia danych.",
          ],
        },
        {
          title: "Zakres danych",
          body: [
            "Przetwarzamy dane konta: imie lub nazwe, email, haslo w postaci skrotu, nazwe firmy, role, status konta i date logowania.",
            "Przetwarzamy dane produktowe wprowadzone przez uzytkownika lub pobrane z integracji: nazwy, EAN, SKU, opisy, zdjecia, atrybuty, kategorie, statusy importu i eksportu.",
            "Przetwarzamy dane techniczne: adres IP, zdarzenia logowania, bledy integracji, statusy zadan, identyfikatory platnosci Stripe i logi bezpieczenstwa.",
          ],
        },
        {
          title: "Cele i podstawy",
          body: [
            "Dane sa potrzebne do zalozenia konta, logowania, realizacji uslugi SaaS, generowania tresci AI, obslugi integracji marketplace, rozliczen i bezpieczenstwa systemu.",
            "Podstawami przetwarzania sa wykonanie umowy, obowiazki prawne, prawnie uzasadniony interes operatora oraz zgoda tam, gdzie jest wymagana.",
          ],
        },
        {
          title: "Odbiorcy i podmioty przetwarzajace",
          body: [
            "Dane moga byc przekazywane dostawcom hostingu, poczty email, platnosci, narzedzi AI, baz danych, monitoringu oraz operatorom marketplace, jezeli uzytkownik wlaczy integracje.",
            "Platnosci obsluguje Stripe. Dane produktowe moga byc przesylane do Google Gemini, Allegro, Amazon, Icecat lub innych integracji aktywowanych przez uzytkownika.",
          ],
        },
        {
          title: "Okres przechowywania",
          body: [
            "Dane konta przechowujemy przez czas aktywnosci konta, a po zamknieciu przez okres potrzebny do rozliczen, obrony roszczen i obowiazkow prawnych.",
            "Logi techniczne i diagnostyczne przechowujemy tak krotko, jak pozwala bezpieczna obsluga systemu. Dane rozliczeniowe przechowujemy zgodnie z wymaganiami podatkowymi i ksiegowymi.",
          ],
        },
        {
          title: "Prawa uzytkownika",
          body: [
            "Masz prawo dostepu do danych, sprostowania, usuniecia, ograniczenia, sprzeciwu, przenoszenia danych i cofniecia zgody, jezeli przetwarzanie opiera sie na zgodzie.",
            "Masz prawo wniesienia skargi do Prezesa Urzedu Ochrony Danych Osobowych.",
          ],
        },
        {
          title: "Cookies i localStorage",
          body: [
            "LuMir uzywa localStorage do utrzymania sesji, ustawien jezyka i motywu. Niezbedne cookies lub podobne technologie moga byc uzywane do bezpieczenstwa i logowania.",
            "Zewnetrzne systemy platnosci lub integracji moga stosowac wlasne technologie zgodnie ze swoimi politykami.",
          ],
        },
      ]}
    />
  );
}
