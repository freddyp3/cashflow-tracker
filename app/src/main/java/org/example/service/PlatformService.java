package org.example.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.example.repository.StatsRepository;
import org.springframework.stereotype.Service;

/**
 * Canonical platform names and platform normalisation.
 *
 * <p>{@link #normalise(String)} maps free-form platform input onto
 * {@link #CANONICAL} spellings (plus known website aliases) and is applied on
 * every order write. {@link #allPlatforms()} backs
 * {@code GET /api/meta/platforms} with the canonical list followed by any other
 * normalised values present in the database.</p>
 */
@Service
public class PlatformService {

    /** Canonical platform names, in display order. */
    public static final List<String> CANONICAL = List.of(
            "Grailed", "Depop", "eBay", "Instagram", "In Person",
            "Facebook Marketplace", "Website", "Other");

    private static final Set<String> WEBSITE_ALIASES = Set.of(
            "archivelol website", "cashflow-tracker website");

    private final StatsRepository stats;

    public PlatformService(StatsRepository stats) {
        this.stats = stats;
    }

    /**
     * Returns the canonical spelling of {@code raw}: {@code null} stays
     * {@code null}, blank trims to {@code ""}, case-insensitive canonical
     * matches and website aliases map to their canonical entry, anything else
     * returns the trimmed input unchanged.
     */
    public String normalise(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) {
            return "";
        }
        for (String canonical : CANONICAL) {
            if (canonical.equalsIgnoreCase(trimmed)) {
                return canonical;
            }
        }
        if (WEBSITE_ALIASES.contains(trimmed.toLowerCase(Locale.ROOT))) {
            return "Website";
        }
        return trimmed;
    }

    /**
     * {@link #CANONICAL} in order, then every distinct platform value in the
     * database whose normalised form is non-blank and not already canonical,
     * deduplicated and sorted case-insensitively.
     */
    public List<String> allPlatforms() {
        List<String> extras = new ArrayList<>();
        for (String value : stats.getDistinctPlatforms()) {
            String normalised = normalise(value);
            if (normalised == null || normalised.isBlank()
                    || CANONICAL.contains(normalised)
                    || extras.stream().anyMatch(e -> e.equalsIgnoreCase(normalised))) {
                continue;
            }
            extras.add(normalised);
        }
        extras.sort(String.CASE_INSENSITIVE_ORDER);
        List<String> all = new ArrayList<>(CANONICAL);
        all.addAll(extras);
        return all;
    }
}
