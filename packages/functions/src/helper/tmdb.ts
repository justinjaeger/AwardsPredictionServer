import { type Person, type Movie } from 'src/types/models';
import TmdbRequests from './tmdbRequests';
import { type ApiResponse } from 'src/types/responses';

const getMovieAsDbType = async (
  tmdbId: number,
  i?: number
): Promise<ApiResponse<Movie>> => {
  try {
    const { data: movie } = await TmdbRequests.getMovie(tmdbId);

    const { data: movieCredits } = await TmdbRequests.getMovieCredits(tmdbId);

    const directing = movieCredits.crew
      .filter((c) => c.job.toLowerCase() === 'director')
      .map((crew) => crew.name);
    const screenplay = movieCredits.crew
      .filter(
        (c) =>
          c.job.toLowerCase() === 'screenplay' ||
          c.job.toLowerCase() === 'writer'
      )
      .map((crew) => crew.name);
    const cinematography = movieCredits.crew
      .filter((c) => c.job.toLowerCase() === 'director of photography')
      .map((crew) => crew.name);
    const productionDesign = movieCredits.crew
      .filter(
        (c) =>
          c.job.toLowerCase() === 'production design' ||
          c.job.toLowerCase() === 'set decoration'
      )
      .map((crew) => crew.name);
    const editing = movieCredits.crew
      .filter((c) => c.job.toLowerCase() === 'editor')
      .map((crew) => crew.name);
    const costumes = movieCredits.crew
      .filter((c) => c.job.toLowerCase() === 'costume designer')
      .map((crew) => crew.name);
    const score = movieCredits.crew
      .filter((c) => c.job.toLowerCase() === 'original music composer')
      .map((crew) => crew.name);
    const vfx = movieCredits.crew
      .filter((c) => c.job.toLowerCase() === 'visual effects supervisor')
      .map((crew) => crew.name);
    const cast = movieCredits.cast
      ?.map((c) => c.name)
      .filter((c, i) => i < 10) // display 10 cast members max
      .join(', ');

    const data: Movie = {
      tmdbId,
      title: movie.title,
      year: movie.release_date
        ? parseInt(movie.release_date?.slice(0, 4), 10)
        : undefined,
      plot: movie.overview,
      imdbId: movie.imdb_id,
      cast,
      posterPath: movie.poster_path || undefined,
      backdropPath: movie.backdrop_path,
      categoryCredits: {
        directing,
        screenplay,
        cinematography,
        productionDesign,
        costumes,
        score,
        editing,
        vfx
      }
    };

    return {
      statusCode: 200,
      data
    };
  } catch (err) {
    console.log('error:', err);
    return {
      statusCode: 500,
      message: 'tmdb error',
      error: JSON.stringify(err)
    };
  }
};

const getPersonAsDbType = async (
  tmdbId: number
): Promise<ApiResponse<Person>> => {
  try {
    const { data: person } = await TmdbRequests.getPerson(tmdbId);

    const data: Person = {
      tmdbId,
      name: person.name,
      imdbId: person.imdb_id,
      posterPath: person.profile_path ?? undefined
    };

    return {
      statusCode: 200,
      data
    };
  } catch (err) {
    return {
      statusCode: 500,
      message: 'tmdb error',
      error: JSON.stringify(err)
    };
  }
};

const Tmdb = {
  getMovieAsDbType,
  getPersonAsDbType
};

export default Tmdb;
