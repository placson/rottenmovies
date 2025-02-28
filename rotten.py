#!/usr/bin/env python3

import requests

from bs4 import BeautifulSoup
import json

MOVIE_SEARCH_URL = "https://www.rottentomatoes.com/search?search=%s" 

def scrape_rotten_tomatoes(movie):
    movie_url = MOVIE_SEARCH_URL % movie
    response = requests.get(movie_url)
    rt_response_html = BeautifulSoup(response.content, 'html.parser')
    movie_results = rt_response_html.find_all('search-page-result',type='movie')
    movie_results = BeautifulSoup(str(movie_results),'html.parser')
    movie_rows = movie_results.find_all('search-page-media-row')    
    for movie_row in movie_rows:
        print(" ------------------------------------------- ")
        href = movie_row.find('a',slot='title')
        cast = movie_row['cast']
        releaseYear = movie_row['releaseyear']
        #print(movie_row)
        print("title: %s" % href.text.strip())
        print("cast: %s" % cast)
        print("release year: %s" % releaseYear)

        # fetch details by going deeper into the exact movie link
        link = href['href'].strip()
        response = requests.get(link)
        rt_response_html = BeautifulSoup(response.content, 'html.parser')
        
        
        # aggregate json (embedded in script at the top of the page)
        agg_json = rt_response_html.find('script', type="application/ld+json").text.strip()

        agg_card = json.loads(agg_json)
        rating = "n/a"
        if 'contentRating' in agg_card:
            rating = agg_card['contentRating']
        # rating
        print("rating: %s" % rating)

        # expecting 1 or more directors
        director = ""
        if 'director' in agg_card:
            for directors in agg_card['director']:
                director += directors['name'] + ","
            print("director(s): %s" % director[:-1]) # strip last comma
        else:
            print("directors(s): n/a")
        
        # media scorecard json (embedded in script)
        scorecard_json = rt_response_html.find('script', id="media-scorecard-json").text.strip()
        scorecard = json.loads(scorecard_json)

        # criticsScore (tomatometer)
        critics_score = scorecard['criticsScore']
        if 'score' in critics_score:
            tomato_score = critics_score['score']
            print("tomatometer score: %s%%" % tomato_score)
        else:
            print("tomatometer score: n/a")
        

        # audienceScore (popcorn meeter)
        pop_score = scorecard['audienceScore']
        if 'score' in pop_score:
            popcorn_score = pop_score['score']
            print("popcorn score: %s%%" % popcorn_score)
        else:
            print("popcorn score: n/a")
        
        
        #synopsis
        synopsis = scorecard['description']
        print("synopsis: %s" % synopsis)
    
if __name__ == "__main__":
    # Example URL for a movie's reviews page on Rotten Tomatoes
    movie = input("Search Rotten Tomatoes database: ")
    scrape_rotten_tomatoes(movie)

    
