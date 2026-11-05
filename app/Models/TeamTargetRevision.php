<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['team_target_id', 'changed_by_id', 'old_target_units', 'old_target_value', 'new_target_units', 'new_target_value'])]
class TeamTargetRevision extends Model {}
