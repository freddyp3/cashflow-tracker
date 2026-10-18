package org.example.service;

import java.math.BigDecimal;
import java.util.Optional;

import org.example.service.GeocodingService.Coordinates;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Unit tests for {@link GeocodingService} against a {@link MockRestServiceServer}
 * bound to a plain {@link RestTemplate}; no request ever leaves the JVM.
 */
class GeocodingServiceTest {

    private static final String BASE_URL = "http://nominatim.test";
    private static final String USER_AGENT =
            "cashflow-tracker/0.0.1 (order shipping-location geocoding)";

    private MockRestServiceServer server;
    private GeocodingService service;

    @BeforeEach
    void setUp() {
        RestTemplate restTemplate = new RestTemplate();
        server = MockRestServiceServer.bindTo(restTemplate).build();
        service = new GeocodingService(restTemplate, BASE_URL);
    }

    private void expectSearch(String q, String body) {
        server.expect(requestTo(Matchers.startsWith(BASE_URL + "/search")))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.USER_AGENT, USER_AGENT))
                .andExpect(queryParam("q", q.replace(" ", "%20")))
                .andExpect(queryParam("format", "jsonv2"))
                .andExpect(queryParam("limit", "1"))
                .andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
    }

    @Test
    void parsesCoordinatesAtScale6() {
        expectSearch("Toronto, ON, CAN", "[{\"lat\":\"43.6532\",\"lon\":\"-79.3832\"}]");

        Optional<Coordinates> result = service.geocode("Toronto, ON, CAN");

        assertTrue(result.isPresent());
        assertEquals(new BigDecimal("43.653200"), result.get().latitude());
        assertEquals(new BigDecimal("-79.383200"), result.get().longitude());
        server.verify();
    }

    @Test
    void repeatedLookupHitsCacheWithoutHttp() {
        expectSearch("Toronto, ON, CAN", "[{\"lat\":\"43.6532\",\"lon\":\"-79.3832\"}]");

        service.geocode("Toronto, ON, CAN");
        Optional<Coordinates> second = service.geocode("Toronto, ON, CAN");

        assertTrue(second.isPresent());
        server.verify();
    }

    @Test
    void tbdBlankAndNullMakeNoRequest() {
        assertTrue(service.geocode(null).isEmpty());
        assertTrue(service.geocode("").isEmpty());
        assertTrue(service.geocode("   ").isEmpty());
        assertTrue(service.geocode("TBD").isEmpty());
        assertTrue(service.geocode("  tbd ").isEmpty());
        server.verify();
    }

    @Test
    void emptyResultIsCached() {
        expectSearch("Nowhere Fake Place, ZZ, XXX", "[]");
        expectSearch("Nowhere Fake Place, XXX", "[]");
        expectSearch("Nowhere Fake Place, ZZ", "[]");

        assertTrue(service.geocode("Nowhere Fake Place, ZZ, XXX").isEmpty());
        assertTrue(service.geocode("Nowhere Fake Place, ZZ, XXX").isEmpty());
        server.verify();
    }

    @Test
    void serverErrorIsNotCached() {
        server.expect(requestTo(Matchers.startsWith(BASE_URL + "/search")))
                .andExpect(queryParam("q", "Berlin,%20BE,%20DEU"))
                .andRespond(withServerError());
        server.expect(requestTo(Matchers.startsWith(BASE_URL + "/search")))
                .andRespond(withSuccess("[{\"lat\":\"52.5200\",\"lon\":\"13.4050\"}]",
                        MediaType.APPLICATION_JSON));

        assertTrue(service.geocode("Berlin, BE, DEU").isEmpty());
        Optional<Coordinates> retry = service.geocode("Berlin, BE, DEU");

        assertTrue(retry.isPresent());
        assertEquals(new BigDecimal("52.520000"), retry.get().latitude());
        server.verify();
    }

    @Test
    void fallsBackToCandidateWithoutNaSegment() {
        expectSearch("Geneva, N/A, CHE", "[]");
        expectSearch("Geneva, CHE", "[{\"lat\":\"46.2044\",\"lon\":\"6.1432\"}]");

        Optional<Coordinates> result = service.geocode("Geneva, N/A, CHE");

        assertTrue(result.isPresent());
        assertEquals(new BigDecimal("46.204400"), result.get().latitude());
        server.verify();
    }

    @Test
    void fallsBackByDroppingCountryCode() {
        expectSearch("Alliston, ON, CAN", "[]");
        expectSearch("Alliston, CAN", "[]");
        expectSearch("Alliston, ON", "[{\"lat\":\"44.1539369\",\"lon\":\"-79.8692321\"}]");

        Optional<Coordinates> result = service.geocode("Alliston, ON, CAN");

        assertTrue(result.isPresent());
        assertEquals(new BigDecimal("44.153937"), result.get().latitude());
        server.verify();
    }

    @Test
    void requestsAreThrottledToOnePerSecond() {
        expectSearch("Toronto, ON, CAN", "[{\"lat\":\"43.6532\",\"lon\":\"-79.3832\"}]");
        expectSearch("Geneva, CHE", "[{\"lat\":\"46.2044\",\"lon\":\"6.1432\"}]");

        long start = System.nanoTime();
        service.geocode("Toronto, ON, CAN");
        service.geocode("Geneva, CHE");
        long elapsedMillis = (System.nanoTime() - start) / 1_000_000;

        assertTrue(elapsedMillis >= 1000, "two requests took only " + elapsedMillis + " ms");
        server.verify();
    }
}
