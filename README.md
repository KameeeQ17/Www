# WildLands.pl

Statyczna strona HTML, wdrażana przez istniejące połączenie GitHub → Vercel. Nie wymaga instalowania pakietów ani zmiany ustawień projektu Vercel.

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
