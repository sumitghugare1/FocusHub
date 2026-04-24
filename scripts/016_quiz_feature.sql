create table if not exists public.quiz_categories (
  slug text primary key,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  category_slug text not null references public.quiz_categories(slug) on delete cascade,
  question text not null,
  options text[] not null,
  correct_option smallint not null,
  difficulty text not null default 'easy' check (difficulty in ('easy', 'medium', 'hard')),
  explanation text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quiz_questions_options_count check (array_length(options, 1) = 4),
  constraint quiz_questions_correct_option_range check (correct_option between 0 and 3),
  constraint quiz_questions_unique_question_per_category unique (category_slug, question)
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_slug text not null references public.quiz_categories(slug) on delete restrict,
  total_questions integer not null check (total_questions > 0),
  correct_answers integer not null check (correct_answers >= 0),
  score_percent numeric(5, 2) not null check (score_percent >= 0 and score_percent <= 100),
  points_earned integer not null default 0,
  time_limit_seconds integer not null check (time_limit_seconds > 0),
  time_spent_seconds integer not null check (time_spent_seconds >= 0),
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint quiz_attempts_correct_answers_range check (correct_answers <= total_questions)
);

create index if not exists idx_quiz_questions_category_active on public.quiz_questions(category_slug, is_active);
create index if not exists idx_quiz_attempts_user_created on public.quiz_attempts(user_id, created_at desc);
create index if not exists idx_quiz_attempts_category_created on public.quiz_attempts(category_slug, created_at desc);

alter table public.quiz_categories enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;

drop policy if exists quiz_categories_select on public.quiz_categories;
create policy quiz_categories_select on public.quiz_categories
  for select using (auth.role() = 'authenticated');

drop policy if exists quiz_questions_select on public.quiz_questions;
create policy quiz_questions_select on public.quiz_questions
  for select using (auth.role() = 'authenticated');

drop policy if exists quiz_attempts_select_own on public.quiz_attempts;
create policy quiz_attempts_select_own on public.quiz_attempts
  for select using (auth.uid() = user_id);

drop policy if exists quiz_attempts_insert_own on public.quiz_attempts;
create policy quiz_attempts_insert_own on public.quiz_attempts
  for insert with check (auth.uid() = user_id);

drop policy if exists quiz_attempts_update_own on public.quiz_attempts;
create policy quiz_attempts_update_own on public.quiz_attempts
  for update using (auth.uid() = user_id);

insert into public.quiz_categories (slug, name, description)
values
  ('html-css-js', 'HTML, CSS and JavaScript', 'Frontend fundamentals and browser behavior.'),
  ('java', 'Java', 'Core Java language, OOP, and standard libraries.'),
  ('python', 'Python', 'Python syntax, data structures, and common patterns.')
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  is_active = true;

insert into public.quiz_questions (category_slug, question, options, correct_option, difficulty, explanation)
values
  ('html-css-js', 'Which HTML tag is used to include JavaScript code in a page?', array['<style>', '<script>', '<javascript>', '<code>'], 1, 'easy', 'The <script> tag embeds or references JavaScript.'),
  ('html-css-js', 'In CSS, which property controls the text size?', array['font-style', 'text-size', 'font-size', 'text-style'], 2, 'easy', 'font-size controls the size of text.'),
  ('html-css-js', 'What does DOM stand for?', array['Document Object Model', 'Data Object Management', 'Digital Ordinance Model', 'Document Order Method'], 0, 'easy', 'DOM stands for Document Object Model.'),
  ('html-css-js', 'Which JavaScript method converts JSON string to object?', array['JSON.parse()', 'JSON.stringify()', 'JSON.convert()', 'JSON.object()'], 0, 'easy', 'JSON.parse reads a JSON string into an object.'),
  ('html-css-js', 'Which CSS selector targets an element with id="hero"?', array['.hero', '#hero', 'hero', '*hero'], 1, 'easy', 'Use # for id selectors.'),
  ('html-css-js', 'What is the default display value of a <div> element?', array['inline', 'inline-block', 'block', 'flex'], 2, 'medium', '<div> is block-level by default.'),
  ('html-css-js', 'Which keyword declares a block-scoped variable in JavaScript?', array['var', 'let', 'static', 'constvar'], 1, 'medium', 'let is block-scoped and reassignable.'),
  ('html-css-js', 'Which array method creates a new array with elements that pass a test?', array['map()', 'reduce()', 'filter()', 'forEach()'], 2, 'medium', 'filter returns matching elements.'),
  ('html-css-js', 'Which CSS property is commonly used with media queries for responsive design?', array['position', 'float', 'max-width', 'z-index'], 2, 'medium', 'max-width helps content adapt to screen sizes.'),
  ('html-css-js', 'What does event.preventDefault() do?', array['Stops event bubbling', 'Prevents default browser action', 'Removes event listener', 'Pauses JavaScript'], 1, 'medium', 'It stops the default behavior like form submit navigation.'),

  ('java', 'Which keyword is used to inherit a class in Java?', array['implements', 'extends', 'inherits', 'super'], 1, 'easy', 'A class extends another class.'),
  ('java', 'What is the entry point method for a Java application?', array['start()', 'run()', 'main()', 'init()'], 2, 'easy', 'public static void main(String[] args) is the entry point.'),
  ('java', 'Which collection does not allow duplicate elements?', array['List', 'Set', 'Map', 'Queue'], 1, 'easy', 'Set enforces uniqueness.'),
  ('java', 'What does JVM stand for?', array['Java Variable Machine', 'Java Virtual Machine', 'Joint Virtual Method', 'Java Verified Module'], 1, 'easy', 'JVM executes Java bytecode.'),
  ('java', 'Which access modifier makes a member visible only within its class?', array['protected', 'public', 'private', 'default'], 2, 'easy', 'private restricts access to the declaring class.'),
  ('java', 'Which statement correctly creates an ArrayList of strings?', array['ArrayList<string> list = new ArrayList<>();', 'ArrayList<String> list = new ArrayList<>();', 'List<String> list = ArrayList();', 'ArrayList<String> list = ArrayList<String>();'], 1, 'medium', 'Java generics are case-sensitive and use String.'),
  ('java', 'What is method overloading?', array['Same method name with different parameters', 'Subclass overriding superclass method', 'Calling private methods only', 'Changing return type only'], 0, 'medium', 'Overloading means same name, different parameter lists.'),
  ('java', 'Which interface supports lambda expressions with a single abstract method?', array['Marker interface', 'Functional interface', 'Serializable interface', 'Cloneable interface'], 1, 'medium', 'Functional interfaces are used for lambdas.'),
  ('java', 'What will happen when an unchecked exception is not caught?', array['Compilation fails', 'Program continues silently', 'Program terminates at runtime', 'JVM converts it to checked exception'], 2, 'medium', 'Unchecked exceptions can terminate execution if uncaught.'),
  ('java', 'Which stream operation is terminal?', array['filter', 'map', 'collect', 'peek'], 2, 'hard', 'collect triggers stream execution and returns a result.'),

  ('python', 'Which symbol is used to define a block in Python?', array['{} braces', '() parentheses', 'Indentation', 'begin/end keywords'], 2, 'easy', 'Python uses indentation for blocks.'),
  ('python', 'What is the correct keyword to define a function?', array['func', 'def', 'function', 'lambda'], 1, 'easy', 'def defines a named function.'),
  ('python', 'Which data type is immutable?', array['list', 'dict', 'set', 'tuple'], 3, 'easy', 'Tuples are immutable.'),
  ('python', 'How do you start a comment in Python?', array['//', '#', '--', '/*'], 1, 'easy', '# starts a comment.'),
  ('python', 'Which built-in function returns the length of a list?', array['size()', 'count()', 'len()', 'length()'], 2, 'easy', 'len() returns length.'),
  ('python', 'What is the output type of 5 / 2 in Python 3?', array['int', 'float', 'str', 'bool'], 1, 'medium', 'Division with / returns float.'),
  ('python', 'Which keyword handles exceptions?', array['catch', 'except', 'error', 'finally'], 1, 'medium', 'except catches exceptions.'),
  ('python', 'What does list comprehension return?', array['A generator always', 'A tuple', 'A list', 'A set'], 2, 'medium', 'List comprehension creates a list.'),
  ('python', 'Which statement is true about dictionaries?', array['Keys can repeat', 'Keys must be unique', 'Values must be strings', 'Dictionaries are ordered by hash only'], 1, 'medium', 'Dictionary keys are unique.'),
  ('python', 'Which module is commonly used for working with JSON data?', array['csv', 'json', 'pickle', 'xml'], 1, 'medium', 'json module handles JSON encoding/decoding.')
on conflict (category_slug, question) do nothing;

drop trigger if exists quiz_questions_updated_at on public.quiz_questions;
create trigger quiz_questions_updated_at
  before update on public.quiz_questions
  for each row
  execute function public.handle_updated_at();
