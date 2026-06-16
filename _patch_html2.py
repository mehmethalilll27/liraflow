import re
from pathlib import Path

BASE = Path(r"C:\Users\mehmet\Desktop\cashflow\web\templates")

SCRIPTS = {
    "firmalar.html": """<script src="/static/js/utils.js"></script>
<script src="/static/js/apiService.js"></script>
<script src="/static/js/firmService.js"></script>
<script src="/static/js/firmalar.page.js"></script>
""",
    "faturalar.html": """<script src="/static/js/utils.js"></script>
<script src="/static/js/apiService.js"></script>
<script src="/static/js/invoiceService.js"></script>
<script src="/static/js/faturalar.page.js"></script>
""",
    "fatura_detay.html": """<script src="/static/js/utils.js"></script>
<script src="/static/js/apiService.js"></script>
<script src="/static/js/invoiceService.js"></script>
<script src="/static/js/fatura_detay.page.js"></script>
""",
}

TBODY = {
    "firmalar.html": ('firma-tablo-body', "divide-y divide-outline-variant"),
    "faturalar.html": ('fatura-tablo-body', "divide-y divide-outline-variant"),
}


def tbody_temizle(path: Path, tbody_id: str, sinif: str) -> None:
    content = path.read_text(encoding="utf-8")
    yeni = f'<tbody id="{tbody_id}" class="{sinif}"></tbody>'
    content, n = re.subn(r"<tbody[^>]*>.*?</tbody>", yeni, content, count=1, flags=re.DOTALL)
    if n == 0:
        print("tbody bulunamadi:", path.name)
    else:
        path.write_text(content, encoding="utf-8")
        print("tbody temizlendi:", path.name)


def script_degistir(path: Path, scripts: str) -> None:
    content = path.read_text(encoding="utf-8")
    content = re.sub(
        r"<!-- Micro-interaction Scripts -->.*?</script>\s*(?=</body>)",
        scripts + "\n",
        content,
        flags=re.DOTALL,
    )
    if "<script src=\"/static/js/utils.js\"></script>" not in content:
        content = re.sub(
            r"<script>\s*function toggleDrawer.*?</script>\s*(?=</body>)",
            scripts + "\n",
            content,
            flags=re.DOTALL,
        )
    if "<script src=\"/static/js/utils.js\"></script>" not in content:
        content = re.sub(
            r"<script>\s*// Simple micro-interaction.*?</script>\s*(?=</body>)",
            scripts + "\n",
            content,
            flags=re.DOTALL,
        )
    if "<script src=\"/static/js/utils.js\"></script>" not in content:
        content = re.sub(
            r"<script>\s*function openModal.*?</script>\s*(?=</body>)",
            scripts + "\n",
            content,
            flags=re.DOTALL,
        )
    path.write_text(content, encoding="utf-8")
    print("script guncellendi:", path.name)


for dosya, (tbody_id, sinif) in TBODY.items():
    tbody_temizle(BASE / dosya, tbody_id, sinif)

for dosya, scripts in SCRIPTS.items():
    script_degistir(BASE / dosya, scripts)
