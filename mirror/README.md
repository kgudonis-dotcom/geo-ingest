# LVM / VMD datu spogulis (jāpalaiž no Latvijas)

1. Instalē Python 3 (python.org, atzīmē "Add to PATH"). Citas bibliotēkas nav vajadzīgas.
2. GitHub → Settings → Developer settings → Fine-grained token: Repository access = geo-ingest, Permissions: **Contents: Read and write**, termiņš 1 gads.
3. `palaist.bat` atver Notepad, `IELIEC_SEIT_TALONU` vietā ieliec talonu, saglabā. Dubultklikšķis uz `palaist.bat`.
   Pirmā reize 20–60 min (LVM_NOGABALI ir liels); tālāk tikai izmaiņas.
4. Automātiski: Windows Uzdevumu plānotājs → Create Basic Task → Daily 03:00 → Start a program → `palaist.bat` (mapē, kur tas guļ).

Kas notiek: faili nonāk repo Release "mirror" (github.com/kgudonis-dotcom/geo-ingest/releases/tag/mirror). GitHub darbplūsmas tos ņem no turienes un ieliek pagastu failos: robežnieki un lielie īpašnieki, LVM ceļi izvešanas modelim, VMD apliecinājumi (ja slānis publiskajā katalogā ir).
