import { useState, useCallback } from 'react';
import { DICOMwebService, DICOMwebConfig } from '../services/dicomweb';
import { DIMSEService, DIMSEConfig } from '../services/dicomTraditional';

interface NetworkConfig {
  protocol: 'dicomweb' | 'dimse';
  host: string;
  port: number;
  callingAET?: string;
  calledAET?: string;
  wadoRsUrl?: string;
  qidoRsUrl?: string;
  stowRsUrl?: string;
}

interface SearchCriteria {
  patientId?: string;
  patientName?: string;
  studyDate?: string;
  modality?: string;
  accessionNumber?: string;
}

export const useDICOMNetworking = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentConfig, setCurrentConfig] = useState<NetworkConfig | null>(null);

  const dicomwebService = new DICOMwebService({
    wadoRsUrl: 'http://localhost:8000/dicomweb',
    qidoRsUrl: 'http://localhost:8000/dicomweb',
    stowRsUrl: 'http://localhost:8000/dicomweb'
  });
  const dimseService = new DIMSEService({
    websocketUrl: 'ws://localhost:8000/dimse/dimse'
  });

  const testConnection = useCallback(async (config: NetworkConfig) => {
    setIsLoading(true);
    setError(null);

    try {
      if (config.protocol === 'dicomweb') {
        dicomwebService.config.wadoRsUrl = config.wadoRsUrl || `http://${config.host}:${config.port}/dicomweb`;
        dicomwebService.config.qidoRsUrl = config.qidoRsUrl || `http://${config.host}:${config.port}/dicomweb`;
        dicomwebService.config.stowRsUrl = config.stowRsUrl || `http://${config.host}:${config.port}/dicomweb`;

        const studies = await dicomwebService.searchStudies({});
        setIsConnected(true);
        setCurrentConfig(config);
        return { success: true, message: 'DICOMweb connection successful' };
      } else {
        const result = await dimseService.cEcho();
        
        if (result) {
          setIsConnected(true);
          setCurrentConfig(config);
          return { success: true, message: 'DIMSE connection successful' };
        } else {
          throw new Error('DIMSE connection failed');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
      setIsConnected(false);
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchStudies = useCallback(async (criteria: SearchCriteria) => {
    if (!isConnected || !currentConfig) {
      throw new Error('Not connected to DICOM server');
    }

    setIsLoading(true);
    setError(null);

    try {
      let results: any[] = [];

      if (currentConfig.protocol === 'dicomweb') {
        results = await dicomwebService.searchStudies({
          PatientID: criteria.patientId,
          StudyDate: criteria.studyDate,
          Modality: criteria.modality
        });
      } else {
        const searchResult = await dimseService.cFind({
          PatientID: criteria.patientId,
          StudyDate: criteria.studyDate,
          Modality: criteria.modality
        });

        results = searchResult || [];
      }

      setSearchResults(results);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, currentConfig]);

  const retrieveStudy = useCallback(async (studyUID: string) => {
    if (!isConnected || !currentConfig) {
      throw new Error('Not connected to DICOM server');
    }

    setIsLoading(true);
    setError(null);

    try {
      if (currentConfig.protocol === 'dicomweb') {
        const instances = await dicomwebService.retrieveMetadata(studyUID);
        return instances;
      } else {
        const result = await dimseService.cMove(studyUID);

        return result;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Retrieve failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, currentConfig]);

  const storeInstance = useCallback(async (dicomFile: File) => {
    if (!isConnected || !currentConfig) {
      throw new Error('Not connected to DICOM server');
    }

    setIsLoading(true);
    setError(null);

    try {
      if (currentConfig.protocol === 'dicomweb') {
        const result = await dicomwebService.storeInstances([dicomFile]);
        return result;
      } else {
        const arrayBuffer = await dicomFile.arrayBuffer();
        const result = await dimseService.cStore(
          arrayBuffer,
          `1.2.3.${Date.now()}`
        );

        return result;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Store failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, currentConfig]);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setCurrentConfig(null);
    setSearchResults([]);
    setError(null);
    
    if (currentConfig?.protocol === 'dimse') {
      dimseService.disconnect();
    }
  }, [currentConfig]);

  return {
    isConnected,
    isLoading,
    error,
    searchResults,
    currentConfig,
    testConnection,
    searchStudies,
    retrieveStudy,
    storeInstance,
    disconnect
  };
};
