/**
 * This Api class lets you define an API endpoint and methods to request
 * data and process it.
 *
 * See the [Backend API Integration](https://docs.infinite.red/ignite-cli/boilerplate/app/services/#backend-api-integration)
 * documentation for more details.
 */
import { create, } from "apisauce";
import Config from "@/config";
import { getGeneralApiProblem } from "./apiProblem";
/**
 * Configuring the apisauce instance.
 */
export const DEFAULT_API_CONFIG = {
    url: Config.API_URL,
    timeout: 10000,
};
/**
 * Manages all requests to the API. You can use this class to build out
 * various requests that you need to call from your backend API.
 */
export class Api {
    apisauce;
    config;
    /**
     * Set up our API instance. Keep this lightweight!
     */
    constructor(config = DEFAULT_API_CONFIG) {
        this.config = config;
        this.apisauce = create({
            baseURL: this.config.url,
            timeout: this.config.timeout,
            headers: {
                Accept: "application/json",
            },
        });
    }
    /**
     * Gets a list of recent React Native Radio episodes.
     */
    async getEpisodes() {
        // make the api call
        const response = await this.apisauce.get(`api.json?rss_url=https%3A%2F%2Ffeeds.simplecast.com%2FhEI_f9Dx`);
        // the typical ways to die when calling an api
        if (!response.ok) {
            const problem = getGeneralApiProblem(response);
            if (problem)
                return problem;
        }
        // transform the data into the format we are expecting
        try {
            const rawData = response.data;
            // This is where we transform the data into the shape we expect for our model.
            const episodes = rawData?.items.map((raw) => ({
                ...raw,
            })) ?? [];
            return { kind: "ok", episodes };
        }
        catch (e) {
            if (__DEV__ && e instanceof Error) {
                console.error(`Bad data: ${e.message}\n${response.data}`, e.stack);
            }
            return { kind: "bad-data" };
        }
    }
}
// Singleton instance of the API for convenience
export const api = new Api();
//# sourceMappingURL=index.js.map