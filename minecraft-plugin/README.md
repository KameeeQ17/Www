# WildLandsRecent 2.0 — lobby Paper, HTTPS bez dodatkowego portu

Wersja 2 zastępuje wersję 1. Nie uruchamia serwera HTTP i nie używa `port` ani `bind-address`. Wysyła pięć ostatnich różnych osób, które weszły na lobby, do `https://www.wildlands.pl/api/recent` przez zwykłe wychodzące HTTPS (port 443). Zainstaluj wyłącznie na jednym lobby, żeby inne serwery nie nadpisywały jego listy.

## Instalacja

1. Zatrzymaj lobby. Usuń poprzedni JAR WildLandsRecent z `plugins` i wgraj nowy `WildLandsRecent-HTTPS.jar`. Pozostaw tylko jeden JAR tej wtyczki.
2. W folderze `plugins/WildLandsRecent/` zastąp stary `config.yml` nowym plikiem `config.yml` z paczki. Możesz zachować `recent.properties`, żeby nie utracić zapisanych wejść. Jeśli folder jeszcze nie istnieje, utwórz go.
3. Otwórz nowy `config.yml`. Skopiuj wartość po `secret:` (bez otaczających ją apostrofów).
4. Vercel → projekt www → Settings → Environment Variables → Add Environment Variable:
   - Key: `RECENT_PLAYERS_SECRET`
   - Value: klucz skopiowany z `config.yml`
   - Environment: Production
   Zapisz i wykonaj Deployments → najnowsze wdrożenie → Redeploy. Dotychczasowy `GITHUB_TOKEN` musi pozostać ustawiony dla Production z uprawnieniem Contents: Read and write do repozytorium Www. Hasło panelu jest niezależne. Zmienna `MINECRAFT_RECENT_URL` nie jest już używana.
5. Kiedy Vercel pokaże Ready, uruchom lobby i wejdź do gry. W konsoli powinno pojawić się `Polaczono ze strona. Historia lobby zostala przeslana.`. Główki i nicki powinny pojawić się na stronie po około 1–3 minutach.

Plik `config.yml` z paczki zawiera wygenerowany prywatny klucz. Nie publikuj go, nie wysyłaj w rozmowie i nie dodawaj do GitHub. W publicznym repozytorium jest wyłącznie szablon. W razie utraty klucza wygeneruj nowy losowy klucz minimum 32 znaki i ustaw identyczną wartość w obu miejscach.

## Działanie i ograniczenia

- Dane zapisywane są trwale w `recent-players.json` na osobnej gałęzi `wildlands-player-data` tego samego repozytorium. Funkcja tworzy gałąź przy pierwszej wysyłce. Gałąź dziedziczy kod i ustawienia z main, ale dalsze zapisy danych nie zmieniają main. `git.deploymentEnabled` wyłącza wdrożenia tej konkretnej gałęzi. Nie scalaj jej do main i nie wdrażaj ręcznie.
- Nicki, UUID i daty ostatnich wejść są publiczne — tak jak lista na stronie. Wtyczka nie przesyła haseł ani adresów IP graczy. GitHub zachowuje historię zapisów na gałęzi danych, także po zniknięciu gracza z ostatniej piątki. Repozytorium jest publiczne.
- Klucz HTTPS uprawnia jedynie do aktualizacji listy wejść. Token GitHub pozostaje wyłącznie w Vercel. Używane jest sprawdzanie certyfikatów HTTPS, brak przekierowań i stały adres odbiorcy. Nie ma operacji zarządzania serwerem Minecraft.
- Wysyłka tylko przy zmianie listy lub po starcie, najwyżej jeden cykl na około minutę. Brak zmian nie powoduje nowych zapisów. Nieudane wysyłki są ponawiane. GitHub to proste rozwiązanie dla małego serwera, zależne od dostępności API i ważności tokenu.
- Historia lokalna pozostaje w `recent.properties`. Po restarcie jest ponownie wysyłana. Nie da się odtworzyć wejść sprzed instalacji, jeśli nie były zapisane. Ponowne wejście tej samej osoby przesuwa ją na początek listy. Główki pobiera przeglądarka przez mc-heads.net. Na offline-mode niestandardowy skin może nie odpowiadać UUID.
- Wtyczka korzysta ze standardowego API Bukkit obsługiwanego przez Paper; kompilacja do Java 8 przeciw API Spigot 1.16.5. Skompilowano i sprawdzono odbiornik po stronie strony w testach z imitacją GitHub. Nie uruchomiono wtyczki na docelowym lobby — wymaga to dostępu do hostingu. Nie używaj `/reload`; zrestartuj lobby.

## Gdy nie działa

- HTTP 401: klucz `secret` różni się od `RECENT_PLAYERS_SECRET`.
- HTTP 503: brakuje klucza lub GITHUB_TOKEN w Production, albo po ich dodaniu nie wykonano Redeploy.
- HTTP 502: sprawdź ważność GITHUB_TOKEN i Contents: Read and write; możliwa też chwilowa awaria GitHub.
- Błąd HTTPS: hosting musi pozwalać na zwykłe połączenia wychodzące do www.wildlands.pl:443. Nie otwieraj dodatkowego portu przychodzącego.
- Komunikat o braku `secret`: na lobby pozostał stary config z wersji 1 — zastąp go nowym.
