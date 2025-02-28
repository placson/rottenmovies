# Rotten Tomatoes Parser

## Description

Dear user,

This is a very simple HTML scraper using BeautifulSoup4 in Python3.

It must be understood that Rotten Tomatoes does not have an official API 
and so we poor developers are forced to write these silly screen scrapers
to fetch valuable movie information.

This means that every few years (or months?) Rotten Tomatoes may change
their UI and therefore break this simple tool. Feel free modify for your
specific use!

Sincerely,
Patrick Lacson

## Installation

Instructions on how to install the project and its dependencies.

```bash
pip install -r requirements.txt
```

## Run
./rotten.py

## Output
```
$ ./rotten.py 
Search Rotten Tomatoes database: no country for old men
 ------------------------------------------- 
title: No Country for Old Men
cast: Tommy Lee Jones,Javier Bardem,Josh Brolin
release year: 2007
rating: R
director(s): Joel Coen,Ethan Coen
tomatometer score: 93%
popcorn score: 86%
synopsis: While out hunting, Llewelyn Moss (Josh Brolin) finds the grisly aftermath of a drug deal. Though he knows better, he cannot resist the cash left behind and takes it with him. The hunter becomes the hunted when a merciless killer named Chigurh (Javier Bardem) picks up his trail. Also looking for Moss is Sheriff Bell (Tommy Lee Jones), an aging lawman who reflects on a changing world and a dark secret of his own, as he tries to find and protect Moss.
```

Or your query may return multiple results

```
$ ./rotten.py 
Search Rotten Tomatoes database: lethal weapon
 ------------------------------------------- 
title: Lethal Weapon
cast: Mel Gibson,Danny Glover,Gary Busey
release year: 1987
rating: R
director(s): Richard Donner
tomatometer score: 80%
popcorn score: 86%
synopsis: Following the death of his wife, Los Angeles police detective Martin Riggs (Mel Gibson) becomes reckless and suicidal. When he is reassigned and partnered with Roger Murtaugh (Danny Glover), Riggs immediately clashes with the older officer. Together they uncover a massive drug-trafficking ring. As they encounter increasingly dangerous situations, Riggs and Murtaugh begin to form a bond. Riggs' volatile behavior might just help them apprehend the criminals -- if it doesn't kill them both first.
 ------------------------------------------- 
title: Lethal Weapon 2
cast: Mel Gibson,Danny Glover,Joe Pesci
release year: 1989
rating: R
director(s): Richard Donner
tomatometer score: 82%
popcorn score: 78%
synopsis: South African smugglers find themselves being hounded and harassed by Riggs and Murtaugh, two mismatched Los Angeles police officers. However, the South Africans are protected by diplomatic immunity, and so the two are assigned to witness-protection duty in an attempt by their captain to keep his job. It is only when this witness reveals to them that he has already dealt with the smugglers that the trouble really starts.
 ------------------------------------------- 
title: Lethal Weapon 4
cast: Mel Gibson,Danny Glover,Joe Pesci
release year: 1998
rating: R
director(s): Richard Donner
tomatometer score: 52%
popcorn score: 64%
synopsis: Detective Riggs (Mel Gibson) tries to settle down with his pregnant girlfriend, Lorna (Rene Russo), while his partner, Murtaugh (Danny Glover), comes to grips with the marriage of his pregnant daughter, Rianne (Traci Wolfe), to fellow cop Butters (Chris Rock). But they find themselves and their families targeted by Chinese mobsters, led by Wah Sing Ku (Jet Li). Riggs, Murtaugh, Butters and private eye Getz (Joe Pesci) decide to go on the offensive before the gangsters get to their loved ones.
 ------------------------------------------- 
title: Lethal Weapon 3
cast: Mel Gibson,Danny Glover,Joe Pesci
release year: 1992
rating: R
director(s): Richard Donner
tomatometer score: 60%
popcorn score: 61%
synopsis: Veteran police detective Roger Murtaugh (Danny Glover) is only days away from retiring when he and his tough partner, Martin Riggs (Mel Gibson), are roped into an important internal affairs case. Working with the beautiful, no-nonsense Sergeant Lorna Cole (Rene Russo) and aided by the shifty informant Leo Getz (Joe Pesci), Murtaugh and Riggs begin to close in on a black-market weapons operation involving corrupt cop and arms dealer Jack Travis (Stuart Wilson).
 ------------------------------------------- 
title: The lethal weapon
cast: 
release year: 2015
rating: n/a
directors(s): n/a
tomatometer score: n/a
popcorn score: n/a
synopsis: 
 ------------------------------------------- 
title: Deadly Weapon
cast: Rodney Eastman,Kim Walker,Gary Frank
release year: 1988
rating: PG-13
director(s): Michael Miner
tomatometer score: n/a
popcorn score: 40%
synopsis: A bullied teen (Rodney Eastman) gains a girlfriend (Kim Walker) and respect with a ray gun the U.S. government wants back.
```
