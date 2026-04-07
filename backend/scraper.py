import time
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import requests
from bs4 import BeautifulSoup

PAGES = [
    ("https://vignan.ac.in/newvignan/", "01_homepage.txt"),
    ("https://vignan.ac.in/policies.php", "02_policies.txt"),
    ("https://vignan.ac.in/admissions.php", "03_admissions.txt"),
    ("https://vignan.ac.in/newvignan/tuitionfeepay.php", "04_fees_btech.txt"),
    ("https://vignan.ac.in/feesmtech.php", "05_fees_mtech.txt"),
    ("https://vignan.ac.in/curscholorships.php", "06_scholarships.txt"),
    ("https://vignan.ac.in/newvignan/calender.php", "07_academic_calendar.txt"),
    ("https://vignan.ac.in/exam_home.php", "08_examinations.txt"),
    ("https://vignan.ac.in/Regulations.php", "09_regulations.txt"),
    ("https://vignan.ac.in/transport.php", "10_transport.txt"),
    ("https://vignan.ac.in/newvignan/newstudent.php", "11_hostel.txt"),
    ("https://vignan.ac.in/newvignan/directory.php", "12_contacts.txt"),
    ("https://vignan.ac.in/directory.php", "13_directory.txt"),
    ("https://vignan.ac.in/contact.php", "14_contact.txt"),
    ("https://vignan.ac.in/ug.php", "15_ug_programs.txt"),
    ("https://vignan.ac.in/newvignan/program.php", "16_pg_programs.txt"),
    ("https://vignan.ac.in/grievance.php", "17_grievance.txt"),
    ("https://vignan.ac.in/anti-ragging.php", "18_anti_ragging.txt"),
    ("https://vignan.ac.in/libhome.php", "19_library.txt"),
    ("https://vignan.ac.in/newvignan/placements.php", "20_placements.txt"),
    ("https://vignan.ac.in/newvignan/whychooseus.php", "21_holistic_training.txt"),
    ("https://vignan.ac.in/newvignan/termsconditions.php", "22_refund_policy.txt"),
    ("https://vignan.ac.in/u-life.php", "23_university_life.txt"),
    ("https://vignan.ac.in/inadproc.php", "24_international_admission.txt"),
    ("https://vignan.ac.in/phd.php", "25_phd.txt"),
    ("https://vignan.ac.in/newvignan/aboutus.php", "26_about_us.txt"),
    (
        "https://vignan.ac.in/newvignan/departments/depthome.php?deptid=sch3_dept1&school=sch3&deptnm=CSE",
        "27_cse_department.txt",
    ),
]


def clean_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")

    for tag in soup.find_all(["script", "style", "nav", "footer", "header", "img"]):
        tag.decompose()

    raw_text = soup.get_text(separator="\n", strip=True)

    seen = set()
    cleaned_lines = []
    for line in raw_text.splitlines():
        normalized = " ".join(line.split()).strip()
        if len(normalized) < 4:
            continue
        if normalized in seen:
            continue
        seen.add(normalized)
        cleaned_lines.append(normalized)

    return "\n".join(cleaned_lines)


def _build_url_variants(url: str) -> list[str]:
    """Return likely URL variants for pages that moved under /newvignan/."""
    parsed = urlsplit(url)
    path = parsed.path or ""
    path_parts = [part for part in path.split("/") if part]
    basename = path_parts[-1] if path_parts else ""

    candidates: list[str] = [url]
    seen = {url}

    def add_candidate(new_path: str) -> None:
        if not new_path.startswith("/"):
            new_path = f"/{new_path}"
        candidate = urlunsplit(
            (parsed.scheme, parsed.netloc, new_path, parsed.query, parsed.fragment)
        )
        if candidate not in seen:
            seen.add(candidate)
            candidates.append(candidate)

    if basename and not path.lstrip("/").startswith("newvignan/"):
        add_candidate(f"newvignan/{basename}")

    if basename and basename.lower() != basename:
        lowered = basename.lower()
        if path_parts:
            lowered_path = "/".join(path_parts[:-1] + [lowered])
            add_candidate(lowered_path)
        if path_parts and path_parts[0] != "newvignan":
            add_candidate(f"newvignan/{lowered}")

    return candidates


def _fetch_first_working_url(
    url: str, headers: dict[str, str], timeout: int = 30
) -> tuple[str, requests.Response]:
    last_exception: Exception | None = None
    for candidate in _build_url_variants(url):
        try:
            response = requests.get(candidate, headers=headers, timeout=timeout)
            response.raise_for_status()
            return candidate, response
        except Exception as exc:
            last_exception = exc

    if last_exception is None:
        raise RuntimeError(f"No URL variants generated for: {url}")
    raise last_exception


def scrape_all() -> None:
    docs_dir = Path(__file__).resolve().parent / "docs"
    docs_dir.mkdir(parents=True, exist_ok=True)

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        )
    }

    for url, filename in PAGES:
        output_path = docs_dir / filename
        try:
            source_url, response = _fetch_first_working_url(url, headers=headers, timeout=30)
            page_text = clean_text(response.text)

            final_text = f"SOURCE URL: {source_url}\n\n{page_text}\n"
            output_path.write_text(final_text, encoding="utf-8")

            print(f"SUCCESS: {source_url} -> {filename}")
        except Exception as exc:
            error_text = f"SOURCE URL: {url}\n\nSCRAPE FAILED: {exc}\n"
            output_path.write_text(error_text, encoding="utf-8")
            print(f"FAILED: {url} -> {filename} | {exc}")

        time.sleep(0.8)


if __name__ == "__main__":
    scrape_all()
