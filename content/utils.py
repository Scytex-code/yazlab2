import requests
from django.conf import settings
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

        published_date = volume_info.get("publishedDate", "")
        publication_year = None
        if published_date and len(published_date) >= 4:
            try:
                publication_year = int(published_date[:4]) 
            except ValueError:
                pass 
        
        categories = volume_info.get("categories", [])
        genres_list = ", ".join(categories) 

        Book.objects.get_or_create(
            google_books_id=book_id,
            defaults={
                "title": title,
                "authors": authors,
                "description": description,
                "page_count": page_count,
                "cover_url": cover_url,
                "publication_year": publication_year, 
                "genres_list": genres_list
            }
        )


TMDB_API_KEY = settings.TMDB_API_KEY

def fetch_tmdb_movies(query, page=1):
    search_url = "https://api.themoviedb.org/3/search/movie"

    search_params = {
        "api_key": TMDB_API_KEY,
        "query": query,
        "page": page,
        "include_adult": False,
        "language": "tr-TR"
    }

    response = requests.get(search_url, params=search_params)
    data = response.json()
    results = data.get("results", [])

    for movie in results:
        tmdb_id = movie["id"]
        full_poster_url = (
            f"https://image.tmdb.org/t/p/w500{movie.get('poster_path')}"
            if movie.get("poster_path") else None
        )
        release_date_str = movie.get("release_date")
        validated_release_date = release_date_str if release_date_str else None
        
        detail_url = f"https://api.themoviedb.org/3/movie/{tmdb_id}"
        detail_params = {
            "api_key": TMDB_API_KEY,
            "append_to_response": "credits",
            "language": "tr-TR"
        }
        detail_response = requests.get(detail_url, params=detail_params)
        detail_data = detail_response.json()

        director_name = None
        for crew_member in detail_data.get("credits", {}).get("crew", []):
            if crew_member.get("job") == "Director":
                director_name = crew_member.get("name")
                break

        cast_list = detail_data.get("credits", {}).get("cast", [])
        actors = [actor.get("name") for actor in cast_list[:5]]
        actors_list = ", ".join(actors)

        genres = [genre.get("name") for genre in detail_data.get("genres", [])]
        genres_list = ", ".join(genres)

        Movie.objects.get_or_create(
            tmdb_id=tmdb_id,
            defaults={
                "title": movie.get("title"),
                "overview": movie.get("overview"),
                "release_date": validated_release_date,
                "poster_path": full_poster_url,
                "director_name": director_name,
                "actors_list": actors_list,
                "genres_list": genres_list,
            }
        )