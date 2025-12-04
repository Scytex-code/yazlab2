import requests
from .models import Book
from .models import Movie


def fetch_google_books(query="harry potter", max_results=40):
    url = f"https://www.googleapis.com/books/v1/volumes?q={query}&maxResults={max_results}"
    response = requests.get(url)

    if response.status_code != 200:
        print(f"API isteği başarısız oldu: {response.status_code}")
        return

    data = response.json()

    for item in data.get("items", []):
        book_id = item.get("id")
        volume_info = item.get("volumeInfo", {})
        
        title = volume_info.get("title", "Başlık Yok")
        authors = ", ".join(volume_info.get("authors", []))
        description = volume_info.get("description", "")
        page_count = volume_info.get("pageCount") 
        cover_url = volume_info.get("imageLinks", {}).get("thumbnail", "")

        Book.objects.get_or_create(
            google_books_id=book_id,
            defaults={
                "title": title,
                "authors": authors,
                "description": description,
                "page_count": page_count,
                "cover_url": cover_url
            }
        )


TMDB_API_KEY = "46c62a30b0d26eae4d273eb302ef8cb6"

def fetch_tmdb_movies(query, page=1):
    url = f"https://api.themoviedb.org/3/search/movie"

    params = {
        "api_key": TMDB_API_KEY,
        "query": query,
        "page": page,
        "include_adult": False
    }

    response = requests.get(url, params=params)
    data = response.json()
    results = data.get("results", [])

    for movie in results:
        Movie.objects.get_or_create(
            tmdb_id=movie["id"],
            defaults={
                "title": movie.get("title"),
                "overview": movie.get("overview"),
                "release_date": movie.get("release_date"),
                "poster_path": movie.get("poster_path"),
            }
        )