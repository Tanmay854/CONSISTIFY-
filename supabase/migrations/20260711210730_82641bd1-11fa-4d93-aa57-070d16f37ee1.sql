-- Collapse any run of 2+ spaces/tabs/non-breaking-spaces to a single space,
-- and any run of 3+ newlines to two — across all summary pages, descriptions,
-- key takeaways, and why-read fields on every book.
UPDATE public.books
SET
  summary_pages = COALESCE((
    SELECT jsonb_agg(
      to_jsonb(
        regexp_replace(
          regexp_replace(
            replace(replace(elem, E'\u00A0', ' '), E'\t', ' '),
            '[ ]{2,}', ' ', 'g'
          ),
          E'\n{3,}', E'\n\n', 'g'
        )
      )
    )
    FROM jsonb_array_elements_text(summary_pages) elem
  ), summary_pages),
  description = regexp_replace(regexp_replace(replace(replace(COALESCE(description,''), E'\u00A0',' '), E'\t',' '), '[ ]{2,}',' ','g'), E'\n{3,}', E'\n\n','g'),
  key_takeaways = regexp_replace(regexp_replace(replace(replace(COALESCE(key_takeaways,''), E'\u00A0',' '), E'\t',' '), '[ ]{2,}',' ','g'), E'\n{3,}', E'\n\n','g'),
  why_read = regexp_replace(regexp_replace(replace(replace(COALESCE(why_read,''), E'\u00A0',' '), E'\t',' '), '[ ]{2,}',' ','g'), E'\n{3,}', E'\n\n','g')
WHERE jsonb_typeof(summary_pages) = 'array';