import axios from 'axios';
import {
  type iTmdbResponse,
  type iTmdbMovieResponse,
  type iTmdbPersonResponse,
  type iTmdbMovieCreditsResponse,
  type iTmdbPersonMovieCredits,
  type iTmdbSearchMoviesResponse,
  type iTmdbSearchMovieIdResponse,
  type iTmdbSearchPersonsResponse
} from 'src/types/tmdb';

const TMDB_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY ?? '';

const getMovie = async (tmdbId: number) => {
  const url = `${TMDB_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}`;
  return (await axios(url)) as iTmdbResponse<iTmdbMovieResponse>;
};

const getMovieCredits = async (tmdbId: number) => {
  const url = `${TMDB_URL}/movie/${tmdbId}/credits?api_key=${TMDB_API_KEY}`;
  return (await axios(url)) as iTmdbResponse<iTmdbMovieCreditsResponse>;
};

const getPerson = async (tmdbId: number) => {
  const url = `${TMDB_URL}/person/${tmdbId}?api_key=${TMDB_API_KEY}`;
  return (await axios(url)) as iTmdbResponse<iTmdbPersonResponse>;
};

const getPersonCredits = async (tmdbId: number) => {
  const url = `${TMDB_URL}/person/${tmdbId}/movie_credits?api_key=${TMDB_API_KEY}`;
  return (await axios(url)) as iTmdbResponse<iTmdbPersonMovieCredits>;
};

const searchMovies = async (query: string) => {
  const url = `${TMDB_URL}/search/movie?query=${query.toLowerCase()}&api_key=${TMDB_API_KEY}`;
  return (await axios(url)) as iTmdbResponse<iTmdbSearchMoviesResponse>;
};

const searchMovieById = async (query: string) => {
  const url = `${TMDB_URL}/movie/${query}?api_key=${TMDB_API_KEY}`;
  return (await axios(url)) as iTmdbResponse<iTmdbSearchMovieIdResponse>;
};

const searchPersons = async (query: string) => {
  const url = `${TMDB_URL}/search/person?query=${query.toLowerCase()}&api_key=${TMDB_API_KEY}`;
  return (await axios(url)) as iTmdbResponse<iTmdbSearchPersonsResponse>;
};

const TmdbRequests = {
  getMovie,
  getMovieCredits,
  getPerson,
  getPersonCredits,
  searchMovies,
  searchMovieById,
  searchPersons
};

export default TmdbRequests;
