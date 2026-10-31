<?php

return [
    /*
     * Nilai ini hanya baseline pengembangan. Aktivasi produksi menunggu
     * persetujuan Product Owner dan operasional dealer (PRD FCT-02).
     */
    'approved' => false,
    'weights' => [
        'lead' => 0.10,
        'prospect' => 0.25,
        'hot_prospect' => 0.50,
        'spk' => 0.75,
        'do' => 0.90,
    ],
];
