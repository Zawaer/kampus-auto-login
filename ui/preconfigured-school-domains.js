// Shared ADFS domains for MPASSid school groups.
//
// These keys must match the `title` values in `mpassid_response.json`.
// Every school inside that MPASSid group will use the configured domain.

globalThis.KAMPUS_PRECONFIGURED_MPASS_TITLE_DOMAINS = {
    'Espoo': 'sts.edu.espoo.fi',
};

// Optional exact-school overrides for schools that do not fit a full MPASSid
// group. These are applied after MPASSid title groups, so they can also override
// one specific school if needed.

globalThis.KAMPUS_PRECONFIGURED_SCHOOL_DOMAIN_GROUPS = [];
