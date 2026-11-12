import { DealerSettingsPage } from '@/components/dealer-settings-page';
import {
    VehicleMaster,
    type VehicleModel,
    type VehicleType,
} from '@/components/vehicle-master';

export default function DealerVehicles({
    vehicleTypes,
    vehicleModels,
}: {
    vehicleTypes: VehicleType[];
    vehicleModels: VehicleModel[];
}) {
    return (
        <DealerSettingsPage title="Master kendaraan">
            <VehicleMaster types={vehicleTypes} models={vehicleModels} />
        </DealerSettingsPage>
    );
}
