-- ----------------------------------------------------------
-- Epic C discovery finding: the Open PM Curriculum initiative was still
-- flagged 'coming_soon' even though its general-pm pathway has been live
-- with real content (9 modules, 33 lessons) since Build Prompt 3. Flipping
-- this so the /initiatives index badge matches reality — the page itself
-- already correctly shows "interim, actively expanding" messaging, this
-- just stops the index card from reading as not-yet-available.
-- ----------------------------------------------------------
update public.initiatives set status = 'live' where slug = 'open-pm-curriculum';
