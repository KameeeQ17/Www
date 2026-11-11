# WildLandsRecent — Paper

Wtyczka rejestruje pięciu ostatnich różnych graczy, którzy weszli na serwer od instalacji. Ponowne wejście tej samej osoby przesuwa ją na początek listy. Zapis pozostaje po restarcie w `plugins/WildLandsRecent/recent.properties`. Nie odtwarza historii sprzed instalacji. UUID jest używany do pobrania główki; na serwerach offline-mode niestandardowe skiny mogą nie zostać odwzorowane.

## Instalacja

1. Wgraj `WildLandsRecent.jar` do folderu `plugins` serwera Paper i uruchom go ponownie.
2. W panelu hostingu przydziel **dodatkowy port TCP**. To musi być inny port niż port Minecraft. Wpisz go do `plugins/WildLandsRecent/config.yml` w polu `port`, po czym ponownie uruchom serwer.
3. Publiczny adres `http://ADRES-SERWERA:PRZYDZIELONY-PORT/recent` powinien pokazać `{"players":[]}` lub listę wejść. Jeżeli hosting zapewnia HTTPS lub reverse proxy, użyj HTTPS. Endpoint jest tylko do odczytu i ujawnia wyłącznie pięć nicków, UUID i dat wejścia; nie ma operacji administracyjnych.
4. W Vercel → projekt www → Settings → Environment Variables dodaj `MINECRAFT_RECENT_URL` z pełnym adresem z kroku 3 dla Production i wykonaj Redeploy.
5. Po wejściu gracza odśwież stronę; odczyty mogą mieć opóźnienie około minuty. Strona łączy się z endpointem przez Vercel; nie wymaga zgód CORS ani wyłączania zabezpieczeń przeglądarki.

Jeśli hosting nie pozwala na dodatkowy port TCP/HTTP, ta metoda wymaga pomocy hostingu w udostępnieniu endpointu. Nie ustawiaj tego samego portu co Minecraft. Wtyczka uruchamia mały serwer HTTP tylko do odczytu; nie udostępnia plików, adresów IP graczy ani haseł.

## Zgodność i weryfikacja

Używa standardowego Bukkit API, obsługiwanego przez Paper, i Java 8 bytecode. Skompilowana przeciw Spigot API 1.16.5. Nie używa wewnętrznych klas Minecraft ani zależności zewnętrznych. Nie przetestowano uruchomienia na docelowym serwerze Paper — dokładna wersja serwera nie została podana. Po instalacji sprawdź w konsoli komunikat `Historia wejsc: port ...`.

Źródło w `src/`. `plugin.yml` i `config.yml` muszą być w głównym katalogu JAR. HTTP nie wykonuje wywołań Bukkit z wątku obsługującego żądania. Historia jest aktualizowana przy PlayerJoinEvent, a zapisy wykonywane sekwencyjnie poza głównym wątkiem gry.
