# WildLands.pl

## Ostatnio dołączający gracze

Strona główna pobiera historię przez `/api/recent`. Potrzebna jest wtyczka `WildLandsRecent` i dodatkowy port HTTP w hostingu serwera. Instrukcja i źródło: `minecraft-plugin/README.md`. Zmienna Vercel: `MINECRAFT_RECENT_URL`. Bez niej strona pokazuje informację o oczekiwaniu na połączenie, bez fikcyjnych graczy. Licznik online nadal działa niezależnie. Główki pobierane są z mc-heads.net po UUID; dane odświeżane są co minutę.

## Panel administratora

Adres: https://www.wildlands.pl/admin

Panel pozwala dodawać i edytować aktualności, ustawić datę oraz podejrzeć treść. Po „Zapisz i opublikuj” serwer zapisuje aktualności w repozytorium i uruchamia istniejące wdrożenie Vercel. Hasło i token nigdy nie trafiają do plików strony. Sesja trwa 2 godziny; zmiana hasła unieważnia dotychczasowe sesje po wdrożeniu nowych ustawień.

### Jednorazowa aktywacja przez właściciela

1. W [ustawieniach tokenów GitHub](https://github.com/settings/personal-access-tokens/new) utwórz fine-grained personal access token. Właściciel zasobu: `KameeeQ17`, wybrane repozytorium: tylko `Www`, uprawnienie `Contents: Read and write`. Pozostałe uprawnienia pozostaw bez zmian. Ustaw termin ważności i odnów token przed jego wygaśnięciem.
2. W [ustawieniach projektu Vercel](https://vercel.com/wild-b894/www/settings/environment-variables) dodaj dla środowiska **Production**:
   - `ADMIN_PASSWORD` — własne unikalne hasło minimum 20 znaków (najlepiej wygenerowane przez menedżer haseł).
   - `GITHUB_TOKEN` — token utworzony w kroku 1.
3. W Vercel wybierz **Deployments → najnowsze wdrożenie → Redeploy**. Zmienne zaczną działać po nowym wdrożeniu.
4. Otwórz `/admin`, zaloguj się swoim hasłem i dodaj pierwszy wpis. Nie przesyłaj hasła ani tokenu w rozmowie.

Bez konfiguracji panel i zapis pozostają zablokowane. Repozytorium musi nadal pozwalać tokenowi na zapis do `main`. Publiczne aktualności są nadal serwowane statycznie z ostatniego wdrożenia.

### Zabezpieczenia i zachowanie

- Podpisana sesja w ciasteczku Secure, HttpOnly, SameSite=Strict, wygasająca po 2 godzinach.
- Kontrola pochodzenia żądań do zapisu i logowania: tylko `https://wildlands.pl` i `https://www.wildlands.pl`.
- Limit prób logowania jest lokalny dla instancji funkcji; dla globalnego limitowania można skonfigurować regułę rate limiting w Vercel Firewall.
- Walidacja po stronie serwera i kontrola wersji pliku chronią przed nadpisaniem równoległej edycji. Przy konflikcie skopiuj niezapisany tekst, odśwież listę i ponów zmianę.
- Nie ma usuwania wpisów w panelu. Edycja i dodawanie to podstawowy zakres panelu.
- Token wygasły, cofnięty albo bez praw do zapisu powoduje komunikat błędu; niezapisany tekst pozostaje w otwartej karcie. Hasło i token przechowuje wyłącznie Vercel.
- Po zapisie publiczna strona zmieni się dopiero po udanym wdrożeniu Vercel. Komunikat w panelu potwierdza zapis i rozpoczęcie publikacji, nie jej zakończenie.

Strona HTML z funkcją serwerową `/api/admin`, wdrażana przez istniejące połączenie GitHub → Vercel. Nie wymaga instalowania pakietów.

## Dodawanie aktualności w GitHub

1. Otwórz plik `aktualnosci.json` i kliknij ikonę ołówka.
2. Dodaj wpis według przykładu poniżej. Między wpisami musi być przecinek. `\n` oznacza nowy wiersz tekstu.
3. Wybierz „Commit changes” na gałęzi `main`. Vercel opublikuje zmianę automatycznie, jeżeli integracja pozostaje aktywna.

```json
[
  {
    "date": "2026-11-11",
    "title": "Tytuł Twojego ogłoszenia",
    "content": "Tutaj wpisz treść ogłoszenia.\nTutaj kolejny akapit."
  }
]
```

Wpisy sortują się od najnowszej daty. Zawartość jest wyświetlana jako zwykły tekst, bez uruchamiania HTML. Usunięcie wszystkich wpisów: `[]`. Edycja przez GitHub wymaga dostępu do repozytorium; strona nie zawiera publicznego panelu zapisu ani haseł.

## Regulamin

Pełny tekst pobrany z https://mc.wildlands.pl/page/9014 i zweryfikowany 11.11.2026. Zachowano tekst, poprawiono strukturę zagnieżdżonych list i nagłówków. Kopia nie synchronizuje się automatycznie — po zmianie źródła należy zaktualizować `regulamin.html` i datę weryfikacji.

## Licznik graczy

API: https://api.mcsrvstat.us/3/WildLands.pl. Odczyt przy otwarciu strony i co 60 sekund na aktywnej karcie. API może buforować odpowiedzi. Błąd połączenia pokazuje brak danych, a nie fikcyjne zero graczy. Limit czasu: 10 sekund.

## Pliki

- `index.html` — strona główna
- `regulamin.html` — pełny regulamin
- `aktualnosci.html`, `aktualnosci.json` — lista i treść aktualności
- `style.css`, `app.js` — wspólny wygląd i zachowanie

Animacje respektują ustawienie ograniczania ruchu w systemie. Wszystkie podstrony mają wspólne tło, nawigację, informacje o serwerze i licznik.
