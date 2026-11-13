# ATTRIBUTION — VetAI Global image credits

Local copies of external images, with their original sources and licenses.
Created 2026-11-12 (repair Batch E, audit items 4, 32, 33).
All images below were downloaded once from the listed original URL, converted
to WebP (ffmpeg/libwebp, quality 78, capped widths: Commons 1024px, Unsplash
1280px, YouTube thumbnails native 480×360), and are now served locally from
`assets/commons/`, `assets/unsplash/`, and `assets/youtube/`.

Rules used here: artist names and license names are copied exactly from the
audit evidence (`findings/04-books-licenses-assets.md`, Wikimedia Commons API
records checked 2026-11-13). Where the audit documented no name or license,
the entry says so explicitly with a TODO — no name, license, or URL was invented.

## TODO (owner lookup)

- Unsplash photographers and license terms: the audit did not examine Unsplash
  terms or record photographer names for any of the 60 photos below.
  Each entry links to the direct image URL it was downloaded from (the honest
  source). Photographer names and photo-page URLs must be looked up by the owner.
- YouTube video channels/authors: `data/media.json` records no channel or author
  for any of the 62 videos; thumbnail licenses are not documented.
- Commons artist fields that were garbled or missing in the API response
  (marked per entry below) need an owner lookup on the Commons file page.
- Simon file-page URL: the audit documented the FilePath source URL only; the
  Commons file-page URL (`https://commons.wikimedia.org/wiki/File:...`) was not
  in the findings and was not guessed. The visible caption links to the
  FilePath source URL. TODO: confirm the file-page URL and update the link.
- Atlas images (120 animals) are NOT listed here: they are loaded at runtime
  from LoremFlickr / Wikipedia / Picsum and change per request, so per-image
  attribution is structurally impossible. See the atlas footer note and the
  TODO in the repair report (option: replace LoremFlickr with Wikipedia-only).

## 1. Wikimedia Commons (52 files)

License and artist are the Commons API `LicenseShortName` / `Artist` values
recorded in the audit. “License not stated on page” marks cards whose on-page
credit line named no license before this repair; the Commons API license is
shown alongside so the entry stays honest about both facts.

| Local file | Original URL | License | Photographer / Artist | Notes |
|---|---|---|---|---|
| `assets/commons/2016-05-02_Kundasang_-_Desa_Cattle_Dairy_Farm_01.webp` | https://thumb.wikimedia.org/wikipedia/commons/thumb/5/57/2016-05-02_Kundasang_-_Desa_Cattle_Dairy_Farm_01.jpg/960px-2016-05-02_Kundasang_-_Desa_Cattle_Dairy_Farm_01.jpg | CC BY 2.0 | Adznee Abas |  |
| `assets/commons/A_herd_of_goats_and_sheep_in_the_shed_at_Mlinza_Farm_01.webp` | https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f0/A_herd_of_goats_and_sheep_in_the_shed_at_Mlinza_Farm_01.jpg/960px-A_herd_of_goats_and_sheep_in_the_shed_at_Mlinza_Farm_01.jpg | CC BY-SA 4.0 | Zahara5555 |  |
| `assets/commons/Able_Seacat_Simon.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Able%20Seacat%20Simon.jpg?width=1024 | CC BY-SA 3.0 | Acabashi | SIMON: gravestone photo, Ilford Animal Cemetery, video still 1 Sep 2010 — NOT a live cat; file-page URL TODO, caption links to the FilePath source URL |
| `assets/commons/Abyssinian_cat_-_Patricia.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Abyssinian_cat_-_Patricia.jpg?width=800 | CC BY-SA 4.0 | Oleg Royko |  |
| `assets/commons/Ara_ararauna_-Lion_Country_Safari_-head-8.webp` | https://thumb.wikimedia.org/wikipedia/commons/thumb/6/65/Ara_ararauna_-Lion_Country_Safari_-head-8.jpg/960px-Ara_ararauna_-Lion_Country_Safari_-head-8.jpg | CC BY-SA 2.0 | Matthew Hoelscher from Doral, FL, USA |  |
| `assets/commons/Arabian_Mau_Cat.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Arabian_Mau_Cat.jpg?width=800 | CC BY-SA 3.0 | SolnishkoA |  |
| `assets/commons/Balto_1925.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Balto%201925.jpg?width=1024 | Public domain | Unknown authorUnknown author | artist as recorded in audit (unknown) |
| `assets/commons/Beagle_sleeping_in_Hautmont_DSC07212.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Beagle_sleeping_in_Hautmont_%28DSC07212%29.jpg?width=800 | CC BY 4.0 | Trougnouf (Benoit Brummer) |  |
| `assets/commons/Bengal_-_20150311_14h56_10000.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Bengal_-_20150311_14h56_%2810000%29.jpg?width=800 | CC BY-SA 4.0 | unknown — TODO (owner lookup) [حقل الفنان مشوش في استجابة API] | artist field garbled in API response — TODO (owner lookup) |
| `assets/commons/Border_Collie_with_Heterochromia.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Border_Collie_with_Heterochromia.jpg?width=800 | CC BY-SA 4.0 | 7575u |  |
| `assets/commons/Buchfart_Portrait_weisses_Pferd.webp` | https://thumb.wikimedia.org/wikipedia/commons/thumb/9/97/Buchfart_Portrait_wei%C3%9Fes_Pferd.jpg/960px-Buchfart_Portrait_wei%C3%9Fes_Pferd.jpg | CC0 | NutzerAusBerlin |  |
| `assets/commons/Cat_Sphynx._Kittens._img_20.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Cat_Sphynx._Kittens._img_20.jpg?width=800 | CC BY-SA 4.0 | Dmitry Makeev |  |
| `assets/commons/Cat_offered_a_tube_treat_during_handling_in_Newark_New_Jersey.webp` | https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d5/Cat_offered_a_tube_treat_during_handling_in_Newark%2C_New_Jersey.jpg/960px-Cat_offered_a_tube_treat_during_handling_in_Newark%2C_New_Jersey.jpg | CC BY 4.0 | Veterinarian Pet Alliance |  |
| `assets/commons/Cher_Ami.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Cher%20Ami.jpg?width=1024 | Public domain | United States Signal Corps |  |
| `assets/commons/Chevreau_de_Tozeur.webp` | https://thumb.wikimedia.org/wikipedia/commons/thumb/5/57/Chevreau_de_Tozeur.jpg/960px-Chevreau_de_Tozeur.jpg | CC BY-SA 4.0 | Tsaag Valren |  |
| `assets/commons/Chickens_at_Parafield_Poultry_Farm_GN12787.webp` | https://thumb.wikimedia.org/wikipedia/commons/thumb/1/14/Chickens_at_Parafield_Poultry_Farm%28GN12787%29.jpg/960px-Chickens_at_Parafield_Poultry_Farm%28GN12787%29.jpg | CC0 | State Government Photographer |  |
| `assets/commons/CleverHans.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/CleverHans.jpg?width=1024 | Public domain | Karl Krall |  |
| `assets/commons/Close-up_of_a_veterinarian_examining_a_maltese_dog.webp` | https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f0/Close-up_of_a_veterinarian_examining_a_maltese_dog.jpg/960px-Close-up_of_a_veterinarian_examining_a_maltese_dog.jpg | CC BY 2.0 | Shixart1985 | also referenced with UTM tracking params in data/gallery.json (same file) |
| `assets/commons/Close-up_of_a_veterinarian_examining_a_maltese_dog_with_a_stethoscope._51687314898.webp` | https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0d/Close-up_of_a_veterinarian_examining_a_maltese_dog_with_a_stethoscope._%2851687314898%29.jpg/960px-Close-up_of_a_veterinarian_examining_a_maltese_dog_with_a_stethoscope._%2851687314898%29.jpg | CC BY 2.0 | Nenad Stojkovic |  |
| `assets/commons/Dolly_face_closeup.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Dolly%20face%20closeup.jpg?width=1024 | CC BY-SA 2.0 | Toni Barros from São Paulo, Brasil | license not stated on page — TODO (Commons API license shown) |
| `assets/commons/Faithful_Dog_Hachiko_Photo.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Faithful%20Dog%20Hachiko%20Photo.png?width=1024 | Public domain | Unknown | artist as recorded in audit (unknown); was a 1.7MB unresized PNG; now WebP 1024×1306 |
| `assets/commons/Felicette_et_Bigoudis.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/F%C3%A9licette%20et%20Bigoudis.jpg?width=1024 | CC BY-SA 4.0 | Joël Thibault | license not stated on page — TODO (Commons API license shown) |
| `assets/commons/Foal_in_Mongolia.webp` | https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6b/Foal_in_Mongolia.jpg/960px-Foal_in_Mongolia.jpg | CC0 | Bernard Gagnon |  |
| `assets/commons/Frantsuzskie_buldogi_2013-09-02_11-36.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/%D0%A4%D1%80%D0%B0%D0%BD%D1%86%D1%83%D0%B7%D1%81%D0%BA%D0%B8%D0%B5_%D0%B1%D1%83%D0%BB%D1%8C%D0%B4%D0%BE%D0%B3%D0%B8_2013-09-02_11-36.JPG?width=800 | CC BY-SA 3.0 | User:Frosya a |  |
| `assets/commons/Golden_Retrievers_Dog_Show_Ooty_May25_A7CR_05589.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Golden_Retrievers_Dog_Show_Ooty_May25_A7CR_05589.jpg?width=800 | CC BY-SA 4.0 | Timothy A. Gonsalves |  |
| `assets/commons/Head_Back_Saluki_Dog_Show_2026_Ooty_May26_A7CR_10804.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Head_Back_Saluki_Dog_Show_2026_Ooty_May26_A7CR_10804.jpg?width=800 | CC BY-SA 4.0 | unknown — TODO (owner lookup) [حقل الفنان مشوش في استجابة API] | artist field garbled in API response — TODO (owner lookup) |
| `assets/commons/Hen_with_chicks_Raisen_district_MP_India.webp` | https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/Hen_with_chicks%2C_Raisen_district%2C_MP%2C_India.jpg/960px-Hen_with_chicks%2C_Raisen_district%2C_MP%2C_India.jpg | CC BY-SA 4.0 | Yann (talk) |  |
| `assets/commons/Highland_cattle_calf-20170520-RM-112548.webp` | https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9e/Highland_cattle_calf-20170520-RM-112548.jpg/960px-Highland_cattle_calf-20170520-RM-112548.jpg | CC BY-SA 4.0 | Reinhold Möller Ermell |  |
| `assets/commons/Kitten_supported_on_a_towel-covered_examination_table_in_Newark_New_Jersey.webp` | https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d1/Kitten_supported_on_a_towel-covered_examination_table_in_Newark%2C_New_Jersey.jpg/960px-Kitten_supported_on_a_towel-covered_examination_table_in_Newark%2C_New_Jersey.jpg | CC BY 4.0 | Veterinarian Pet Alliance |  |
| `assets/commons/Laika_in_1957.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Laika%20in%201957.jpg?width=1024 | CC BY 4.0 | Музей космонавтики / Главархив Москвы |  |
| `assets/commons/Maine_Coon_Meowing.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Maine_Coon_Meowing.jpg?width=800 | CC BY-SA 4.0 | Nortlio |  |
| `assets/commons/Mandarin_duck_Aix_galericulata.webp` | https://thumb.wikimedia.org/wikipedia/commons/thumb/7/75/Mandarin_duck_%28Aix_galericulata%29.jpg/960px-Mandarin_duck_%28Aix_galericulata%29.jpg | CC BY 4.0 | Alexis Lours |  |
| `assets/commons/Oryctolagus_cuniculus_Tasmania_2.webp` | https://thumb.wikimedia.org/wikipedia/commons/thumb/3/37/Oryctolagus_cuniculus_Tasmania_2.jpg/960px-Oryctolagus_cuniculus_Tasmania_2.jpg | CC BY-SA 3.0 | JJ Harrison (https://www.jjharrison.com.au/) |  |
| `assets/commons/Pembroke_Welsh_Corgi_Tank.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Pembroke_Welsh_Corgi_Tank.jpg?width=800 | CC BY-SA 4.0 | Lvmubio |  |
| `assets/commons/Persian_in_Cat_Cafe.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Persian_in_Cat_Cafe.jpg?width=800 | CC BY-SA 2.0 | Takashi(aes256) |  |
| `assets/commons/Portrait_of_a_labrador_retriever.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Portrait_of_a_labrador_retriever.jpg?width=800 | CC0 | Dktue |  |
| `assets/commons/Ragdoll_cat_resting_July_30_2022.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Ragdoll_cat_resting_%28July_30%2C_2022%29.jpg?width=800 | CC0 | Elli |  |
| `assets/commons/Red_Standard_Poodle_Abigail_by_Don_Ramey_Logan.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Red_Standard_Poodle_Abigail_by_Don_Ramey_Logan.jpg?width=800 | CC BY-SA 3.0 | Don Ramey Logan |  |
| `assets/commons/Russian_Blue_AB.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Russian_Blue_AB.jpg?width=800 | CC BY-SA 4.0 | Chepry 💬 (Andrzej Barabasz) 📷 🇵🇱 |  |
| `assets/commons/Scarlet_macaw_Ara_macao_cyanopterus_Copan.webp` | https://thumb.wikimedia.org/wikipedia/commons/thumb/4/47/Scarlet_macaw_%28Ara_macao_cyanopterus%29_Copan.jpg/960px-Scarlet_macaw_%28Ara_macao_cyanopterus%29_Copan.jpg | CC BY-SA 4.0 | Charles J. Sharp |  |
| `assets/commons/Scottish_Fold_cat_blue.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Scottish_Fold_cat_%28blue%29.jpg?width=800 | CC BY-SA 3.0 | Peter Perepelkin |  |
| `assets/commons/Sergeant_Stubby.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Sergeant%20Stubby.jpg?width=1024 | Public domain | unknown — TODO (owner lookup) [artist not stated in audit record (shown as —)] | license not stated on page — TODO (Commons API license shown); TODO (owner lookup) |
| `assets/commons/Shih_Tzu_Dog_Walk.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Shih_Tzu_%28Dog_Walk%29.jpg?width=800 | CC BY-SA 4.0 | H.A.W.C 101 |  |
| `assets/commons/Siamese_cat_chocolate_point.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Siamese_cat%2C_chocolate_point.jpg?width=800 | CC BY-SA 4.0 | Felinlove |  |
| `assets/commons/Sitzende_graue_Mieze_20201026_DSC5103.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Sitzende_graue_Mieze_20201026_DSC5103.jpg?width=800 | CC BY 4.0 | PantheraLeo1359531 |  |
| `assets/commons/Six_weeks_old_cat_aka.webp` | https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c1/Six_weeks_old_cat_%28aka%29.jpg/960px-Six_weeks_old_cat_%28aka%29.jpg | CC BY-SA 2.5 | André Karwath aka Aka |  |
| `assets/commons/Stray_German_Shepherd_Dog.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Stray_German_Shepherd_Dog.jpg?width=800 | CC BY-SA 4.0 | Satdeep Gill |  |
| `assets/commons/Teckel_-_39.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Teckel_-_39.jpg?width=800 | CC BY-SA 4.0 | unknown — TODO (owner lookup) [حقل الفنان مشوش في استجابة API] | artist field garbled in API response — TODO (owner lookup) |
| `assets/commons/Turkish_angora-cat.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Turkish_angora-cat.JPG?width=800 | CC BY-SA 3.0 | Himbeerchen |  |
| `assets/commons/Tyto_alba_1_Luc_Viatour.webp` | https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/Tyto_alba_1_Luc_Viatour.jpg/960px-Tyto_alba_1_Luc_Viatour.jpg | CC BY-SA 3.0 | Luc Viatour |  |
| `assets/commons/Werfenweng_2018_Kat_B1_Philip_BOTT-8667.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Werfenweng_2018_Kat_B1_Philip_BOTT-8667.jpg?width=800 | CC BY-SA 4.0 | Isiwal |  |
| `assets/commons/Wojtek_the_soldier_bear.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Wojtek%2C%20the%20soldier%20bear.jpg?width=1024 | CC0 | Pouazity3 |  |

## 2. Unsplash (60 photos)

One local file per photo ID, downloaded at the largest width requested on the
site (800/900/1280px). The audit recorded no photographer name and did not
examine Unsplash license terms for any of these photos.

| Local file | Original URL | License | Photographer | Notes |
|---|---|---|---|---|
| `assets/unsplash/1425082661705-1834bfd09dca.webp` | https://images.unsplash.com/photo-1425082661705-1834bfd09dca?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×596 |
| `assets/unsplash/1434030216411-0b793f4b4173.webp` | https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 800×534 |
| `assets/unsplash/1444464666168-49d633b86797.webp` | https://images.unsplash.com/photo-1444464666168-49d633b86797?auto=format&fit=crop&w=800&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 800×534 |
| `assets/unsplash/1450778869180-41d0601e046e.webp` | https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×530 |
| `assets/unsplash/1456513080510-7bf3a84b82f8.webp` | https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 800×602 |
| `assets/unsplash/1471864190281-a93a3070b6de.webp` | https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=800&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 800×534 |
| `assets/unsplash/1472491235688-bdc81a63246e.webp` | https://images.unsplash.com/photo-1472491235688-bdc81a63246e?auto=format&fit=crop&w=1280&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 1280×854 |
| `assets/unsplash/1477884213360-7e9d7dcc1e48.webp` | https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×600 |
| `assets/unsplash/1484557985045-edf25e08da73.webp` | https://images.unsplash.com/photo-1484557985045-edf25e08da73?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×676 |
| `assets/unsplash/1493962853295-0fd70327578a.webp` | https://images.unsplash.com/photo-1493962853295-0fd70327578a?auto=format&fit=crop&w=1280&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 1280×854 |
| `assets/unsplash/1500382017468-9049fed747ef.webp` | https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1280&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 1280×720 |
| `assets/unsplash/1500595046743-cd271d694d30.webp` | https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×598 |
| `assets/unsplash/1505751172876-fa1923c5c528.webp` | https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 800×534 |
| `assets/unsplash/1507146426996-ef05306b995a.webp` | https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=1280&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 1280×854 |
| `assets/unsplash/1507842217343-583bb7270b66.webp` | https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=800&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 800×470 |
| `assets/unsplash/1514888286974-6c03e2ca1dba.webp` | https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×620 |
| `assets/unsplash/1516467508483-a7212febe31a.webp` | https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=800&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 800×532 |
| `assets/unsplash/1517849845537-4d257902454a.webp` | https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×1200 |
| `assets/unsplash/1519052537078-e6302a4968d4.webp` | https://images.unsplash.com/photo-1519052537078-e6302a4968d4?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×600 |
| `assets/unsplash/1522858547137-f1dcec554f55.webp` | https://images.unsplash.com/photo-1522858547137-f1dcec554f55?auto=format&fit=crop&w=1280&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 1280×854 |
| `assets/unsplash/1524024973431-2ad916746881.webp` | https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×600 |
| `assets/unsplash/1526336024174-e58f5cdd8e13.webp` | https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?auto=format&fit=crop&w=1280&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 1280×1920 |
| `assets/unsplash/1527153857715-3908f2bae5e8.webp` | https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?auto=format&fit=crop&w=1280&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 1280×1524 |
| `assets/unsplash/1529040181623-e04ebc611e25.webp` | https://images.unsplash.com/photo-1529040181623-e04ebc611e25?auto=format&fit=crop&w=1280&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 1280×1928 |
| `assets/unsplash/1530281700549-e82e7bf110d6.webp` | https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×1348 |
| `assets/unsplash/1531646838846-5033894ba2d4.webp` | https://images.unsplash.com/photo-1531646838846-5033894ba2d4?auto=format&fit=crop&w=1280&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 1280×854 |
| `assets/unsplash/1531746790731-6c087fecd65a.webp` | https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&w=800&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 800×576 |
| `assets/unsplash/1532187863486-abf9dbad1b69.webp` | https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 800×534 |
| `assets/unsplash/1533738363-b7f9aef128ce.webp` | https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×1200 |
| `assets/unsplash/1534773728080-33d31da27ae5.webp` | https://images.unsplash.com/photo-1534773728080-33d31da27ae5?auto=format&fit=crop&w=1280&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 1280×1920 |
| `assets/unsplash/1535591273668-578e31182c4f.webp` | https://images.unsplash.com/photo-1535591273668-578e31182c4f?auto=format&fit=crop&w=800&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 800×534 |
| `assets/unsplash/1537151625747-768eb6cf92b2.webp` | https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×1358 |
| `assets/unsplash/1541339907198-e08756dedf3f.webp` | https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 800×534 |
| `assets/unsplash/1543466835-00a7907e9de1.webp` | https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×676 |
| `assets/unsplash/1544568100-847a948585b9.webp` | https://images.unsplash.com/photo-1544568100-847a948585b9?auto=format&fit=crop&w=1280&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 1280×960 |
| `assets/unsplash/1544923408-75c5cef46f14.webp` | https://images.unsplash.com/photo-1544923408-75c5cef46f14?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×1126 |
| `assets/unsplash/1546445317-29f4545e9d53.webp` | https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=1280&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 1280×1852 |
| `assets/unsplash/1548199973-03cce0bbc87b.webp` | https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1280&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 1280×854; also referenced at w=800 |
| `assets/unsplash/1548247416-ec66f4900b2e.webp` | https://images.unsplash.com/photo-1548247416-ec66f4900b2e?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×1244 |
| `assets/unsplash/1548550023-2bdb3c5beed7.webp` | https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×1350 |
| `assets/unsplash/1552053831-71594a27632d.webp` | https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×1444; also referenced at w=800 |
| `assets/unsplash/1552728089-57bdde30beb3.webp` | https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×1230; also referenced at w=800 |
| `assets/unsplash/1553284965-83fd3e82fa5a.webp` | https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×600; also referenced at w=800 |
| `assets/unsplash/1553284965-fa61e9ad4795.webp` | https://images.unsplash.com/photo-1553284965-fa61e9ad4795?auto=format&fit=crop&w=1280&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 1280×854 |
| `assets/unsplash/1560114928-40f1f1eb26a0.webp` | https://images.unsplash.com/photo-1560114928-40f1f1eb26a0?auto=format&fit=crop&w=1280&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 1280×854 |
| `assets/unsplash/1562774053-701939374585.webp` | https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 800×524 |
| `assets/unsplash/1570042225831-d98fa7577f1e.webp` | https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=1280&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 1280×854 |
| `assets/unsplash/1570824104453-508955ab713e.webp` | https://images.unsplash.com/photo-1570824104453-508955ab713e?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×736 |
| `assets/unsplash/1573865526739-10659fec78a5.webp` | https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×1260 |
| `assets/unsplash/1574158622682-e40e69881006.webp` | https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×900 |
| `assets/unsplash/1576201836106-db1758fd1c97.webp` | https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×600; also referenced at w=800 |
| `assets/unsplash/1579154204601-01588f351e67.webp` | https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 800×534 |
| `assets/unsplash/1584308666744-24d5c474f2ae.webp` | https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 800×560 |
| `assets/unsplash/1585110396000-c9ffd4e4b308.webp` | https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×1350; also referenced at w=800 |
| `assets/unsplash/1587300003388-59208cc962cb.webp` | https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×600 |
| `assets/unsplash/1592194996308-7b43878e84a6.webp` | https://images.unsplash.com/photo-1592194996308-7b43878e84a6?auto=format&fit=crop&w=900&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 900×1350 |
| `assets/unsplash/1597651482572-9957ddaacfab.webp` | https://images.unsplash.com/photo-1597651482572-9957ddaacfab?auto=format&fit=crop&w=1280&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 1280×852 |
| `assets/unsplash/1612170153139-6f881ff067e0.webp` | https://images.unsplash.com/photo-1612170153139-6f881ff067e0?auto=format&fit=crop&w=1280&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 1280×854 |
| `assets/unsplash/1655747508339-7cc94a19ac2b.webp` | https://images.unsplash.com/photo-1655747508339-7cc94a19ac2b?auto=format&fit=crop&w=1280&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 1280×1920 |
| `assets/unsplash/1729770892329-855ec57a6284.webp` | https://images.unsplash.com/photo-1729770892329-855ec57a6284?auto=format&fit=crop&w=1280&q=80 | not documented — TODO (owner lookup) | Photographer: unknown — TODO (owner lookup) | 1280×1920 |

## 3. YouTube thumbnails (62 videos)

Thumbnails only (`hqdefault.jpg`, 480×360). The videos themselves still embed
from YouTube. `data/media.json` records no channel/author; thumbnail licenses
are not documented. The site builder loads the local file first and falls back
to the remote thumbnail on error, so a missing file never shows a broken image.

| Local file | Original URL | License | Channel / Author | Video title |
|---|---|---|---|---|
| `assets/youtube/-G16EX6b8Xg.webp` | https://i.ytimg.com/vi/-G16EX6b8Xg/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | 12 شيئًا ضارًا تفعله لكلبك دون قصد |
| `assets/youtube/1UPxT1k5qBM.webp` | https://i.ytimg.com/vi/1UPxT1k5qBM/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | جلسة الفحص البدني للحيوان |
| `assets/youtube/3rlzc7rdlI8.webp` | https://i.ytimg.com/vi/3rlzc7rdlI8/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | لماذا تحصّن دجاجك؟ |
| `assets/youtube/5bYPifuT2m0.webp` | https://i.ytimg.com/vi/5bYPifuT2m0/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | لقاحات الكلاب مشروحة: الأساسي والمعزز |
| `assets/youtube/5oXPvSuq9r4.webp` | https://i.ytimg.com/vi/5oXPvSuq9r4/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | يمشي كأنه سكران؟ مرض الدهليز عند الكلاب والقطط أم سكتة دماغية؟ (The Dogtor) |
| `assets/youtube/6bNXMhkoEOM.webp` | https://i.ytimg.com/vi/6bNXMhkoEOM/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | أمراض الجهاز التنفسي البقري: اختيار العينات وتفسيرها |
| `assets/youtube/6bgQjgiqRLo.webp` | https://i.ytimg.com/vi/6bgQjgiqRLo/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | الأشعة المقطعية أم الرنين المغناطيسي لكلبك أو قطك؟ (Tony et Léon) |
| `assets/youtube/7NETVVJy_tk.webp` | https://i.ytimg.com/vi/7NETVVJy_tk/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | علامات التهاب المفاصل عند الكلاب التي يخفيها عنك |
| `assets/youtube/7WtMTV-rjlQ.webp` | https://i.ytimg.com/vi/7WtMTV-rjlQ/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | اختبار كاليفورنيا لالتهاب الضرع (CMT) — إرشاد جامعة بنسلفانيا |
| `assets/youtube/8WGpTh9Ov6c.webp` | https://i.ytimg.com/vi/8WGpTh9Ov6c/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | العناية بالقطط الصغيرة: 5 نصائح مهمة |
| `assets/youtube/9ck-CExSFjo.webp` | https://i.ytimg.com/vi/9ck-CExSFjo/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | لا تطعم البادجي البذور فقط |
| `assets/youtube/AMBmx56haSY.webp` | https://i.ytimg.com/vi/AMBmx56haSY/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | الفحص السريري العام للكلب والقط — مهارات إكلينيكية (جامعة غويلف) |
| `assets/youtube/B2C6tWvQpLU.webp` | https://i.ytimg.com/vi/B2C6tWvQpLU/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | كيف تعمل البلعمة؟ رحلة داخل جهاز المناعة |
| `assets/youtube/COSVTf5S0G4.webp` | https://i.ytimg.com/vi/COSVTf5S0G4/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | تقليم وترميم حوافر الخيل — عمل الحدّاد خطوة بخطوة |
| `assets/youtube/CjYNCIS5HK0.webp` | https://i.ytimg.com/vi/CjYNCIS5HK0/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | كيف تنظف أسنان قطتك بالفرشاة |
| `assets/youtube/EIpRjarKCTA.webp` | https://i.ytimg.com/vi/EIpRjarKCTA/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | العناية بالقطط اليتيمة حديثة الولادة |
| `assets/youtube/ENVbfdJKJBY.webp` | https://i.ytimg.com/vi/ENVbfdJKJBY/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | فقر الدم الانحلالي المناعي IMHA عند الكلاب — من شحوب اللثة إلى الانهيار (The Dogtor) |
| `assets/youtube/EYdfwFLLDxQ.webp` | https://i.ytimg.com/vi/EYdfwFLLDxQ/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | رعاية الدجاج: الطفيليات الداخلية |
| `assets/youtube/F-lL_REMmRw.webp` | https://i.ytimg.com/vi/F-lL_REMmRw/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | تشخيص انسداد الجهاز الهضمي بالأشعة |
| `assets/youtube/FTFImSYriKw.webp` | https://i.ytimg.com/vi/FTFImSYriKw/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | هل يحتاج كلبك إلى الاستحمام فعلًا؟ |
| `assets/youtube/G7vkErGQFt4.webp` | https://i.ytimg.com/vi/G7vkErGQFt4/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | تغذية الأغنام والماعز |
| `assets/youtube/GqraG_lCDsM.webp` | https://i.ytimg.com/vi/GqraG_lCDsM/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | 7 سلوكيات تُقلق قطتك |
| `assets/youtube/HeaI6HvcVFo.webp` | https://i.ytimg.com/vi/HeaI6HvcVFo/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | كيف تنظف أذني كلبك بطريقة صحيحة |
| `assets/youtube/JEwCK73pC8Y.webp` | https://i.ytimg.com/vi/JEwCK73pC8Y/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | التهاب الصفائح الحساسة (الحُمْرَة) عند الخيول |
| `assets/youtube/LyPpAlkIJDs.webp` | https://i.ytimg.com/vi/LyPpAlkIJDs/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | التعرف على مرض الببغاوات والوقاية منه |
| `assets/youtube/Nw2WjABlxlI.webp` | https://i.ytimg.com/vi/Nw2WjABlxlI/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | تقييم حالة الجسم عند الكلاب (BCS) — جامعة بنسلفانيا |
| `assets/youtube/OhIVRycM5Jg.webp` | https://i.ytimg.com/vi/OhIVRycM5Jg/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | فيروس كورونا القطط وكيف يتحوّر إلى التهاب الصفاق المعدي FIP — د. طارق خالد |
| `assets/youtube/P_Brg4J_gOA.webp` | https://i.ytimg.com/vi/P_Brg4J_gOA/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | ضبط أعداد الكلاب بإنسانية: حلول علمية لمشكلة الكلاب الضالة |
| `assets/youtube/QYcZs84kqXs.webp` | https://i.ytimg.com/vi/QYcZs84kqXs/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | هل يحصل كلبك على تمرين كافٍ؟ |
| `assets/youtube/RPM6Bm_k1r0.webp` | https://i.ytimg.com/vi/RPM6Bm_k1r0/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | كلام بيطري: أسئلة مربي القطط والكلاب تحت المجهر |
| `assets/youtube/RancQgwCN3A.webp` | https://i.ytimg.com/vi/RancQgwCN3A/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | لغة جسد القطط: متى تتوقف عن مداعبتها؟ |
| `assets/youtube/S70ryWoLaMw.webp` | https://i.ytimg.com/vi/S70ryWoLaMw/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | علاج التهاب الضرع عند ماعز الألبان |
| `assets/youtube/VR1eeym8xQM.webp` | https://i.ytimg.com/vi/VR1eeym8xQM/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | أشياء أساسية يجب أن يعرفها كل مربي حيوانات |
| `assets/youtube/ZJgwo-8LDtM.webp` | https://i.ytimg.com/vi/ZJgwo-8LDtM/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | تقليم حوافر الماعز |
| `assets/youtube/ZcQ0rTXo-p8.webp` | https://i.ytimg.com/vi/ZcQ0rTXo-p8/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | 6 نصائح أساسية لمربي القطط الجدد |
| `assets/youtube/cZgwBbGucC0.webp` | https://i.ytimg.com/vi/cZgwBbGucC0/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | أفضل ممارسات مكافحة الديدان في الأغنام والماعز |
| `assets/youtube/dxXd7R4wFYw.webp` | https://i.ytimg.com/vi/dxXd7R4wFYw/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | تقنيات علاج الأغنام عمليًا |
| `assets/youtube/fL7i8QeQWv4.webp` | https://i.ytimg.com/vi/fL7i8QeQWv4/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | إدارة العجول حديثة الاستلام |
| `assets/youtube/gc8RaeQ5g5o.webp` | https://i.ytimg.com/vi/gc8RaeQ5g5o/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | الإنعاش القلبي الرئوي للكلاب والقطط — تدريب عملي للمالكين |
| `assets/youtube/h4p1rvVz8vo.webp` | https://i.ytimg.com/vi/h4p1rvVz8vo/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | داء السكري في الكلاب والقطط: محاضرة الطب الباطني — أ.د. محمد عبده رزق |
| `assets/youtube/hOuTG4ikkaM.webp` | https://i.ytimg.com/vi/hOuTG4ikkaM/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | ما أفضل غذاء للقطط؟ |
| `assets/youtube/hvaTzjz9d0s.webp` | https://i.ytimg.com/vi/hvaTzjz9d0s/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | جدول تحصينات الأغنام الصحيح |
| `assets/youtube/jf6bnM4EL0c.webp` | https://i.ytimg.com/vi/jf6bnM4EL0c/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | داخل مختبر التشريح البيطري — جامعة ولاية كانساس |
| `assets/youtube/kKf4alVS8KU.webp` | https://i.ytimg.com/vi/kKf4alVS8KU/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | دليل الشتاء الآمن للكلاب والقطط — كم من البرد يتحمّل حيوانك؟ (The Dogtor) |
| `assets/youtube/l5hWRsWWfVU.webp` | https://i.ytimg.com/vi/l5hWRsWWfVU/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | مقياس FAMACHA للأغنام والماعز |
| `assets/youtube/mBgon39usbQ.webp` | https://i.ytimg.com/vi/mBgon39usbQ/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | إجراءات الحلب الصحيحة لجودة حليب قصوى — جامعة كنتاكي |
| `assets/youtube/mr4XthkF4sE.webp` | https://i.ytimg.com/vi/mr4XthkF4sE/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | كيف تنظّف أسنان كلبك بالفرشاة؟ — جامعة كورنيل |
| `assets/youtube/n3OwgFrZ4zY.webp` | https://i.ytimg.com/vi/n3OwgFrZ4zY/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | دليل المبتدئين لرعاية الأرنب الأليف |
| `assets/youtube/qKI_UXmz5ek.webp` | https://i.ytimg.com/vi/qKI_UXmz5ek/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | اكتشاف مشاكل الحركة والألم عند الفحص — حوار مع جراح عظام بيطري (Cone of Shame) |
| `assets/youtube/qfZ0Yas1lrI.webp` | https://i.ytimg.com/vi/qfZ0Yas1lrI/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | تقييم حالة الجسم للكلاب والقطط (BCS) |
| `assets/youtube/qofZbBfK0tI.webp` | https://i.ytimg.com/vi/qofZbBfK0tI/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | الفحص العصبي الكامل عند الكلاب — للطلاب والأطباء |
| `assets/youtube/ro8dmc9qSNk.webp` | https://i.ytimg.com/vi/ro8dmc9qSNk/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | التعقيم والإخصاء: القرار المسؤول — الجمعية الطبية البيطرية الأمريكية |
| `assets/youtube/sfzzxGhgxoo.webp` | https://i.ytimg.com/vi/sfzzxGhgxoo/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | كلام بيطري: تراه جميلًا… فهل تعرف الثمن الذي يدفعه؟ — د. أحمد الزيات |
| `assets/youtube/sgc7xtUx_fc.webp` | https://i.ytimg.com/vi/sgc7xtUx_fc/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | التهاب الضرع بالميكوبلازما: المكافحة والإدارة — د. باميلا رويغ |
| `assets/youtube/t4RQZ81oIlE.webp` | https://i.ytimg.com/vi/t4RQZ81oIlE/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | حماية قطيع الدواجن: الأمن الحيوي ضد الأمراض — جامعة بنسلفانيا |
| `assets/youtube/tk4BkaYpNdc.webp` | https://i.ytimg.com/vi/tk4BkaYpNdc/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | داء الإرليخيوز في الكلاب (Ehrlichia canis): علامات وتشخيص وعلاج — مراجعة شاملة |
| `assets/youtube/uO-7qrOx7R4.webp` | https://i.ytimg.com/vi/uO-7qrOx7R4/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | المجترات الصغيرة للمبتدئين وصغار المربين |
| `assets/youtube/wA0YRL4ho3I.webp` | https://i.ytimg.com/vi/wA0YRL4ho3I/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | غسيل أذن الكلب ووضع الدواء فيها |
| `assets/youtube/xVhAIdpyNic.webp` | https://i.ytimg.com/vi/xVhAIdpyNic/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | تجهيز الحظائر قبل الشتاء ومكافحة الطفيليات |
| `assets/youtube/xl-mjwf5pBk.webp` | https://i.ytimg.com/vi/xl-mjwf5pBk/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | 7 أخطاء تُقصّر عمر قطتك دون أن تدري |
| `assets/youtube/xopEflu1YI0.webp` | https://i.ytimg.com/vi/xopEflu1YI0/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | تشريح بيطري مبسط: الحافر |
| `assets/youtube/zR6mtgId5Ew.webp` | https://i.ytimg.com/vi/zR6mtgId5Ew/hqdefault.jpg | not documented — TODO (owner lookup) | unknown — TODO (owner lookup) | حوافر الخيول ببساطة ودور التغذية |

## 4. Not localized

None. Every inventoried external image was downloaded and converted; no remote
image URL is used as an image source anymore, except the YouTube `onerror`
fallback (resilience only) and the attribution links above.

## 5. Out of scope for this file

- Atlas runtime images (LoremFlickr / Wikipedia / Picsum): see TODO above.
- Animal sounds (8 `.ogg` files) and remote 3D models (GLB): no attribution
  was added for these in Batch E; the audit recorded the gap (item 33).
- Pre-existing local assets under `assets/books/`, `assets/animals/`,
  `assets/daily/`, `assets/logo/`, `assets/promo/`: sources/licenses were not
  documented in the audit and are not covered here.
