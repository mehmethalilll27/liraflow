import re
from pathlib import Path

BASE = Path(__file__).parent / "web" / "templates"


def patch(path: Path, tbody_id: str | None, scripts: str) -> None:
    content = path.read_text(encoding="utf-8")
    if tbody_id:
        content = re.sub(
            r"<tbody[^>]*>.*?</tbody>",
            f'<tbody id="{tbody_id}" class="divide-y divide-outline-variant/50"></tbody>'
            if "outline-variant/50" in content
            else f'<tbody id="{tbody_id}" class="divide-y divide-outline-variant"></tbody>',
            content,
            count=1,
            flags=re.DOTALL,
        )
    content = re.sub(
        r"<script>.*?</script>\s*(?=</body>)",
        scripts,
        content,
        count=1,
        flags=re.DOTALL,
    )
    path.write_text(content, encoding="utf-8")
    print("patched", path.name)


panel_scripts = """<script src="/static/js/utils.js"></script>
<script src="/static/js/apiService.js"></script>
<script src="/static/js/dashboardService.js"></script>
<script src="/static/js/invoiceService.js"></script>
<script src="/static/js/panel.page.js"></script>
"""
firmalar_scripts = """<script src="/static/js/utils.js"></script>
<script src="/static/js/apiService.js"></script>
<script src="/static/js/firmService.js"></script>
<script src="/static/js/firmalar.page.js"></script>
"""
faturalar_scripts = """<script src="/static/js/utils.js"></script>
<script src="/static/js/apiService.js"></script>
<script src="/static/js/invoiceService.js"></script>
<script src="/static/js/faturalar.page.js"></script>
"""
detay_scripts = """<script src="/static/js/utils.js"></script>
<script src="/static/js/apiService.js"></script>
<script src="/static/js/invoiceService.js"></script>
<script src="/static/js/fatura_detay.page.js"></script>
"""

patch(BASE / "panel.html", "fatura-tablo-body", panel_scripts)
patch(BASE / "firmalar.html", "firma-tablo-body", firmalar_scripts)
patch(BASE / "faturalar.html", "fatura-tablo-body", faturalar_scripts)
patch(BASE / "fatura_detay.html", None, detay_scripts)
