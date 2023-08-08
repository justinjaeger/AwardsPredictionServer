import { AwardsBody, getAwardsBodyCategories } from "./constants/event.ts";
import connectMongoDB from "./helpers/connectMongoDB.ts";

const createNewEvent = async (awardsBody: AwardsBody, year: number) => {
    const mongodb = await connectMongoDB();
    // create event based on these parameters if it doesn't already exists
    const categories = getAwardsBodyCategories(awardsBody, year);
}