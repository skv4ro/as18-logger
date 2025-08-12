#AS18 LOGGER 
aplikacia pre zber dat na linke Boge AS18 Montážna linka Stellantis
zbieraju sa chybova hlasky (alarmy) a procesne data, ktore sa ukladaju do MS SQL databazy
aplikacia je naprogramovana v JavaScript-e a bezi na platforme NodeJS
pre spustanie a manazaovanie aplikacie sa pouziva modul pm2

1. aplikaciu treba najprv nainstalovat spustenim skriptu 1_install.bat (je potrebne internetove pripojenie)

2. aby sa data mohli ukladat treba mat nainstalovany a nakonfigurovany SQL server
SQL server musi mat povolenu TCP/IP komunikaciu (nastavuje sa cez SQL server configuration manager)
port pre komunikaciu pre vsetky IP nastavit na 1433 a tento port povolit aj vo firewalle vo Windows
na SQL serveri treba nastavit overovanie na sql authentification
nasledne treba vytvorit databazu a uzivatela na SQL server - udaje su v config.js v objekte SQL_CONFIG
uzivatel musi byt pre databazu dbowner 
ked je server nachystany potrebne tabulky aplikacie sa vytvoria spustenim skriptu 2_init_sql.bat

3. aplikacia sa spusta skriptom 3_start.bat
pre automaticke spustanie pri nabehu windowsu treba skript dat do windows schedulera
alebo do aplikacii pri spusteni systemu: 
stlacit win + R -> napisat shell:startup -> vytvorit odkaz na skript

4. aplikacia sa vypina skriprtop 4_stop.bat
pre restart staci aplikaciu vypnut a zapnut