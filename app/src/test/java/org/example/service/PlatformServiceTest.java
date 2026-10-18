package org.example.service;

import java.util.List;

import org.example.repository.StatsRepository;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Unit tests for {@link PlatformService} normalisation and canonical listing. */
class PlatformServiceTest {

    private final StatsRepository stats = mock(StatsRepository.class);
    private final PlatformService service = new PlatformService(stats);

    @Test
    void normaliseMapsToCanonicalSpelling() {
        assertEquals("Grailed", service.normalise("GRAILED"));
        assertEquals("eBay", service.normalise("ebay"));
        assertEquals("Website", service.normalise("archivelol website"));
        assertEquals("Website", service.normalise("Cashflow-Tracker Website"));
        assertEquals("In Person", service.normalise(" In Person "));
        assertEquals("Vinted", service.normalise("Vinted"));
        assertEquals("", service.normalise("   "));
        assertNull(service.normalise(null));
    }

    @Test
    void allPlatformsListsCanonicalThenDeduplicatedExtras() {
        when(stats.getDistinctPlatforms())
                .thenReturn(List.of("GRAILED", "Vinted", "", "Website", "vinted"));

        assertEquals(List.of("Grailed", "Depop", "eBay", "Instagram", "In Person",
                        "Facebook Marketplace", "Website", "Other", "Vinted"),
                service.allPlatforms());
    }
}
