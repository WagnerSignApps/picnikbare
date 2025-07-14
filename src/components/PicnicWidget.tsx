import React from 'react';
import { UserGroupIcon, MapPinIcon } from '@heroicons/react/24/outline';

export interface Participant {
  id: string;
  name: string | null;
  photoURL: string | null;
  picnicPhotoURL?: string | null;
}

export interface PicnicData {
  id: string;
  hostName: string;
  hostPhotoURL: string;
  restaurantName: string;
  participants: Participant[];
  photoURL?: string;
}

interface PicnicWidgetProps {
  picnics: PicnicData[];
  onJoinPicnic?: (picnicId: string) => void;
}

function PicnicWidget({ picnics, onJoinPicnic = () => {} }: PicnicWidgetProps) {
  // No need for auth or firebase here as we receive picnics as props

  if (picnics.length === 0) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow text-center">
        <p className="text-gray-500 dark:text-gray-400 text-lg">There are no ongoing picnics at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {picnics.map((picnic) => (
        <div key={picnic.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <img
                className="h-12 w-12 rounded-full"
                src={picnic.hostPhotoURL || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'}
                alt={picnic.hostName}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
                }}
              />
            </div>
            <div 
              className="flex-1 min-w-0 cursor-pointer" 
              onClick={() => onJoinPicnic(picnic.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onJoinPicnic(picnic.id);
                }
              }}
            >
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {picnic.hostName}'s Picnic
              </p>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <MapPinIcon className="flex-shrink-0 mr-1 h-4 w-4" />
                <span className="truncate">{picnic.restaurantName}</span>
              </div>
              <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                <UserGroupIcon className="flex-shrink-0 mr-1.5 h-4 w-4" />
                <span>{picnic.participants.length} going</span>
              </div>
            </div>
          </div>
          {picnic.photoURL && (
            <div className="mt-3">
              <img
                src={picnic.photoURL}
                alt="Picnic location"
                className="w-full h-32 object-cover rounded-lg"
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/300x150?text=Image+Not+Available';
                }}
              />
            </div>
          )}
          {/* Show all participant selfies */}
          {picnic.participants?.length > 0 && (
            <div className="flex flex-row space-x-2 mt-2">
              {picnic.participants.map((p) => (
                <img
                  key={p.id}
                  src={p.picnicPhotoURL || p.photoURL || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'}
                  className="h-10 w-10 rounded object-cover border border-white shadow"
                  alt={p.name || 'Participant'}
                  title={p.name || ''}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default PicnicWidget;
